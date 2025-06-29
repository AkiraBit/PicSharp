import { sep, parse } from 'node:path';

interface TrieStats {
  // 文件数
  fileCount: number;
  // 目录数
  directoryCount: number;
  // 最大深度
  maxDepth: number;
}

/**
 * 文件系统前缀树节点
 * 每个节点包含子节点映射和可选的文件数据
 */
export class TrieNode<T = any> {
  // 名称
  name: string | '#root';
  // 完整路径
  fullPath: string;
  // 是否为目录节点
  isDirectory: boolean;
  // 父节点
  parent?: TrieNode<T>;
  // 子节点，仅目录节点有
  children?: Map<string, TrieNode<T>>;
  // 文件数据，仅文件节点有
  data?: T;
  // 文件哈希，仅文件节点有
  hash?: string;

  constructor(options: Partial<TrieNode<T>>) {
    this.name = options.name || '';
    this.fullPath = options.fullPath || '';
    this.isDirectory = options.isDirectory || false;
    this.parent = options.parent;
    this.children = options.children;
    this.data = options.data;
    this.hash = options.hash;
  }

  get isLeaf() {
    return !this.isRoot && !this.isDirectory;
  }

  get isRoot() {
    return this.name === '#root';
  }
}

/**
 * 文件系统前缀树
 * 结合前缀树和哈希表，用于存储大规模文件系统结构
 */
export class Trie<T = any> {
  private root: TrieNode<T>;

  constructor() {
    this.root = new TrieNode({ name: '#root', isDirectory: true, children: new Map() });
  }

  /**
   * 将路径分割为路径段
   */
  private splitPath(path: string): string[] {
    const { dir, base } = parse(path.trim());
    return [...dir.split(sep).filter((segment) => segment.length), base];
  }

  /**
   * 获取或创建路径对应的节点
   */
  private createNode(
    path: string,
    isDirectory: boolean = false,
    data?: T,
    hash?: string,
    children?: Map<string, TrieNode<T>>,
  ): TrieNode<T> {
    const segments = this.splitPath(path);
    let current = this.root;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isLastSegment = i === segments.length - 1;
      let isDirectoryNode = isDirectory || !isLastSegment;

      if (current.children) {
        if (!current.children.has(segment)) {
          const newNode = new TrieNode<T>({
            fullPath: sep + segments.slice(0, i + 1).join(sep),
            name: segment,
            parent: current,
            isDirectory: isDirectoryNode,
          });
          if (isDirectoryNode) {
            newNode.children = children || new Map();
          } else {
            newNode.data = data;
            newNode.hash = hash;
          }
          current.children.set(segment, newNode);
        }
        current = current.children.get(segment)!;
      } else {
        break;
      }
    }

    return current;
  }

  /**
   * 获取路径对应的节点
   */
  public getNode(path: string): TrieNode<T> | undefined {
    const segments = this.splitPath(path);
    let current = this.root;

    for (const segment of segments) {
      if (!current?.children || !current.children.has(segment)) {
        return;
      }
      current = current.children.get(segment)!;
    }

    return current;
  }

  public updateLeafNode(
    path: string,
    payload: {
      name?: string;
      data?: T;
      hash?: string;
    },
  ): TrieNode<T> | undefined {
    const node = this.getNode(path);
    if (!node || node.isRoot || !node.data || node.isDirectory) {
      return;
    }
    if (payload.name) {
      node.name = payload.name;
    }
    if (payload.data) {
      node.data = payload.data;
    }
    if (payload.hash) {
      node.hash = payload.hash;
    }
    return node;
  }

  // 添加单个文件
  public add(
    path: string,
    isDirectory: boolean,
    data?: T,
    hash?: string,
    children?: Map<string, TrieNode<T>>,
  ): TrieNode<T> {
    const node = this.createNode(path, isDirectory, data, hash, children);
    return node;
  }

  // 批量添加文件
  public bulkAdd(
    files: Array<{
      path: string;
      isDirectory: boolean;
      data?: T;
      hash?: string;
      children?: Map<string, TrieNode<T>>;
    }>,
  ): Array<TrieNode<T>> {
    return files.map((file) =>
      this.add(file.path, file.isDirectory, file.data, file.hash, file.children),
    );
  }

  // 删除单个文件
  public remove(path: string): boolean {
    const node = this.getNode(path);
    if (!node || node.isRoot || !node.parent || !node.parent.children) {
      return false;
    }
    node.parent.children.delete(node.name);
    return true;
  }

  // 批量删除文件
  public bulkRemove(paths: string[]): Array<{ path: string; result: boolean }> {
    return paths.map((path) => ({ path, result: this.remove(path) }));
  }

  /**
   * 检查路径是否存在
   * @param path 路径
   */
  public hasFile(path: string): boolean {
    const node = this.getNode(path);
    return !!node && !node.isRoot && !node.isDirectory && !!node.data;
  }

  /**
   * 检查路径是否为目录
   * @param path 路径
   * @returns 是否为目录
   */
  public hasDirectory(path: string): boolean {
    const node = this.getNode(path);
    return !!node && !node.isRoot && node.isDirectory;
  }

  /**
   * 检查路径是否存在
   * @param path 路径
   * @returns 是否存在
   */
  public hasPath(path: string): boolean {
    const node = this.getNode(path);
    return !!node && !node.isRoot;
  }

  /**
   * 清空所有数据
   */
  public clear(): void {
    this.root = new TrieNode({ name: '#root', isDirectory: true, children: new Map() });
  }

  /**
   * 获取所有节点路径
   */
  public getAllNodePaths(): string[] {
    const paths: string[] = [];

    const collectPaths = (node: TrieNode<T>, segments: string[]): void => {
      if (segments.length > 0) {
        paths.push(sep + segments.join(sep));
      }

      if (node.children) {
        for (const [segment, childNode] of node.children.entries()) {
          segments.push(segment);
          collectPaths(childNode, segments);
          segments.pop();
        }
      }
    };

    collectPaths(this.root, []);
    return paths;
  }

  /*
   * 获取所有叶子节点路径
   */
  public getAllLeafNodePaths(): string[] {
    const paths: string[] = [];

    const collectPaths = (node: TrieNode<T>, segments: string[]): void => {
      if (!node.isDirectory && !node.children) {
        paths.push(sep + segments.join(sep));
      }

      if (node.children) {
        for (const [segment, childNode] of node.children.entries()) {
          segments.push(segment);
          collectPaths(childNode, segments);
          segments.pop();
        }
      }
    };

    collectPaths(this.root, []);
    return paths;
  }

  /**
   * 获取统计信息
   */
  public stats(): TrieStats {
    let directoryCount = 0;
    let fileCount = 0;
    let maxDepth = 0;

    const calculateStats = (node: TrieNode<T>, depth: number): void => {
      maxDepth = Math.max(maxDepth, depth);

      if (node.isDirectory) {
        directoryCount++;
        if (node.children) {
          for (const childNode of node.children.values()) {
            calculateStats(childNode, depth + 1);
          }
        }
      } else {
        fileCount++;
      }
    };

    for (const node of this.root.children!.values()) {
      calculateStats(node, 0);
    }

    return {
      fileCount,
      directoryCount,
      maxDepth,
    };
  }
}
