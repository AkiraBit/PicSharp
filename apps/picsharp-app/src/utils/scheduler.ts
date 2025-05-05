import EventEmitter from 'eventemitter3';
export namespace IScheduler {
  
  export type Task = ()=>Promise<TaskResult>;

  export type TaskResult = any;
  
  export enum TaskStatus {
    Pending = 'pending',
    Processing = 'processing',
    Completed = 'completed',
    Failed = 'failed',
    Saving = 'saving',
    Done = 'done',
  }
}

export interface SchedulerOptions{
  concurrency:number;
}

export default class Scheduler extends EventEmitter{
  static Events = {
    Fulfilled: 'fulfilled',
    Rejected: 'rejected',
  }

  private running = false;
  private concurrency:number
  private tasks:Array<()=>Promise<IScheduler.TaskResult>> = []
  private results:Array<IScheduler.TaskResult> = []
  
  constructor(options:SchedulerOptions){
    super();
    this.concurrency = options.concurrency || 6;
  }

  public addTasks(...tasks:IScheduler.Task[]){
    if(this.running) return;
    this.tasks.push(...tasks);
    return this;
  }

  public setTasks(tasks:IScheduler.Task[]){
    if(this.running) return;
    this.tasks = tasks;
    return this;
  }

  private execute() {
    let i = 0;
    const ret:Array<Promise<any>> = [];
    const executing:Array<Promise<any>> = [];
    const enqueue = (): Promise<void | any[]> => {
      if (i === this.tasks.length) {
        return Promise.resolve();
      }
      const task = this.tasks[i++];
      const p = Promise.resolve()
        .then(() => task())
        .then((res) => {
          this.emit(Scheduler.Events.Fulfilled,res);
          return res;
        })
        .catch((res) => {
          this.emit(Scheduler.Events.Rejected,res);
        });
      ret.push(p);

      let r = Promise.resolve();
      if (this.concurrency <= this.tasks.length) {
        const e:Promise<any> = p.then(() => {
          return executing.splice(executing.indexOf(e), 1);
        });
        executing.push(e);
        if (executing.length >= this.concurrency) {
          r = Promise.race(executing);
        }
      }
      return r.then(() => enqueue());
    };
    return enqueue().then(() => Promise.all(ret));
  }


  async run() {
    if(this.running) return;
    this.running = true;
    this.results = await this.execute();
    this.running = false;
    return this.results;
  }
}