const inquirer = require('inquirer');
const simpleGit = require('simple-git');
const { execSync } = require('child_process');

const git = simpleGit('./', {
  binary: 'git',
  maxConcurrentProcesses: 6,
});

const getBranches = async () => {
  const branches = await git.branch();
  const remoteBranches = [];
  branches.all.forEach((branch) => {
    if (branch.startsWith('remotes') && (branch.includes('sprint') || branch.includes('dev'))) {
      remoteBranches.push(branch);
    }
  });
  return remoteBranches;
};

const init = async () => {
  const branches = await getBranches();

  if (branches.length === 0) {
    console.error("[-] Unable to find any branches. Make sure this utility is in the correct directory.");
    console.log('Press any key to exit');

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', process.exit.bind(process, 0));
    return;
  }

  /**
   * @type {inquirer.QuestionCollection<any>}
   */
  const questions = [
    {
      type: 'list',
      name: 'sourceBranch',
      choices: branches,
      message: 'Please select the latest sprint branch: ',
    },
    {
      type: 'list',
      name: 'destBranch',
      choices: branches,
      message:
        'Please select the branch you wish to compare against (generally dev or the previous sprint): ',
    },
    {
      type: 'input',
      name: 'outputName',
      message: 'Please enter a name for the output file: ',
    },
  ];

  console.log(`
   /#######            /##                                         /##   /##   /##     /## /## /##   /##              
  | ##__  ##          | ##                                        | ##  | ##  | ##    |__/| ##|__/  | ##              
  | ##  \\ ##  /###### | ##  /######   /######   /#######  /###### | ##  | ## /######   /##| ## /## /######   /##   /##
  | #######/ /##__  ##| ## /##__  ## |____  ## /##_____/ /##__  ##| ##  | ##|_  ##_/  | ##| ##| ##|_  ##_/  | ##  | ##
  | ##__  ##| ########| ##| ########  /#######|  ###### | ########| ##  | ##  | ##    | ##| ##| ##  | ##    | ##  | ##
  | ##  \\ ##| ##_____/| ##| ##_____/ /##__  ## \\____  ##| ##_____/| ##  | ##  | ## /##| ##| ##| ##  | ## /##| ##  | ##
  | ##  | ##|  #######| ##|  #######|  ####### /#######/|  #######|  ######/  |  ####/| ##| ##| ##  |  ####/|  #######
  |__/  |__/ \\_______/|__/ \\_______/ \\_______/|_______/  \\_______/ \\______/    \\___/  |__/|__/|__/   \\___/   \\____  ##
                                                                                                             /##  | ##
  Author: Billy Gisbourne                                                                                   |  ######/
                                                                                                             \\______/ `);
  const answers = await inquirer.prompt(questions);

  const cmd = `git diff --diff-filter=ACMR --name-only ${answers.sourceBranch}..${answers.destBranch} | zip.exe ${answers.outputName}.zip -@`;
  console.log(`[+] Generating zip...`);
  try {
    execSync(cmd);
    console.log(`[+] Zip successfully created.`);
  } catch (error) {
    console.error(`[-] Oops. Something went wrong: ${error}`);
  }
  console.log('Press any key to exit');

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', process.exit.bind(process, 0));
};

init();
