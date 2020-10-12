const inquirer = require('inquirer');
const simpleGit = require('simple-git');
// const { execSync } = require('child_process');
const fs = require('fs');
const zip = require('streamline-zip');
const PATH = require('path');

const git = simpleGit('./', {
  binary: 'git',
  maxConcurrentProcesses: 6,
});

const getBranches = async () => {
  await git.fetch(['origin', '--prune']);
  const branches = await git.branch(['-r']);
  return branches.all;
};

const init = async () => {
  const branches = await getBranches();

  if (branches.length === 0) {
    console.error(
      '[-] Unable to find any branches. Make sure this utility is in the correct directory.'
    );
    console.log('Press any key to exit');

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', process.exit.bind(process, 0));
    return;
  }

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

  /**
   * which type of release does the user need to make?
   * @type {inquirer.QuestionCollection<any>}
   */
  const askType = [
    {
      type: 'list',
      name: 'releaseType',
      choices: ['Public Release', 'QA Release'],
      message: 'What type of release would you like to make?',
    },
  ];

  const typeAnswer = await inquirer.prompt(askType);
  let questions = [];

  if (typeAnswer.releaseType === 'QA Release') {
    questions.push({
      type: 'list',
      name: 'sourceBranch',
      choices: branches,
      message: 'Please select the latest sprint branch: ',
    });

    questions.push({
      type: 'list',
      name: 'destBranch',
      choices: branches,
      message:
        'Please select the branch you wish to compare against (generally dev or the previous sprint): ',
    });
  }

  questions.push({
    type: 'input',
    name: 'outputName',
    message: 'Please enter a name for the output file: ',
  });

  // ask the user the questions
  const answers = await inquirer.prompt(questions);

  //let cmd;
  let options = [];

  switch (typeAnswer.releaseType) {
    case 'Public Release':
      // just check latest master commit vs previous commit and make a zip
      options.push('--diff-filter=ACMR');
      options.push('--name-status');
      options.push('origin/master..origin/master~');
      //cmd = `git diff --diff-filter=ACM --name-only origin/master..origin/master~ | zip.exe ${answers.outputName}.zip -@`;
      break;
    case 'QA Release':
      // check difference between selected branches and make a zip
      options.push('--diff-filter=ACMR');
      options.push('--name-status');
      options.push(`${answers.sourceBranch}..${answers.destBranch}`);
      //cmd = `git diff --diff-filter=ACM --name-only ${answers.sourceBranch}..${answers.destBranch} | zip.exe ${answers.outputName}.zip -@`;
      break;
  }

  console.log(`[+] Generating zip...`);
  try {
    // execute the shell command
    // execSync(cmd);
    const wstream = fs.createWriteStream(`${answers.outputName}.zip`);
    const archive = new zip.Zip(wstream);

    // get the difference between to the branches
    /**
     * get the difference between to the branches
     * @type {String}
     */
    const diff = await git.diff(options);
    const fileChanges = diff.split('\n');
    const filesToAdd = [];
    fileChanges.forEach(change => {
      const regex = /((\w|\w?[0-9]{1,3})\s{4,7})/
      const match = change.match(regex);
      console.log(match);
      const action = match[2];
      const file = change.replace(match[1], '');
      const path = action.startsWith('R') ? file.split('   ')[0] : file;
      const name = PATH.basename(path);

      const fileToAdd = {
        name: name,
        path: path
      };
      filesToAdd.push(fileToAdd);
    });

    archive.add(_, filesToAdd)

    archive.finish(_);
    wstream.end();

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
