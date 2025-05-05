declare global {
  interface Window {
    LAUNCH_PAYLOAD?: LaunchPayload;
  }
}

interface CliArgument {
  value: string;
  occurrences: number;
}

interface LaunchPayload {
  mode: string;
  paths: string[];
  file: FileInfo;
}

const parseLaunchPayload = () => {
  return window.LAUNCH_PAYLOAD;
};

// const parseCLIOpenWithFiles = async () => {
//   const { getMatches } = await import('@tauri-apps/plugin-cli');
//   const matches = await getMatches();
//   const args = matches?.args;
//   const files: string[] = [];
//   if (args) {
//     for (const name of ['file1', 'file2', 'file3', 'file4']) {
//       const arg = args[name] as CliArgument;
//       if (arg && arg.occurrences > 0) {
//         files.push(arg.value);
//       }
//     }
//   }

//   return files;
// };

export const parseOpenWithFiles = () => {
  let payload = parseLaunchPayload();
  //   if (!files && hasCli()) {
  //     files = await parseCLIOpenWithFiles();
  //   }
  return payload;
};
