const config = require('./.config');
const onfleet = require('onfleet')(config.onfleet);
const prompt = require('prompt-sync')();
const colors = require('colors');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const jobArray = [];
var lastPaginated = "(no tasks loaded)";
var lastTask;

const fullPage = async ( last=null, page=0 ) => {
  readline.cursorTo(process.stdout, 0);
  process.stdout.write(`waiting...(page ${page.toString().red.bold})`);
  const now = new Date();
  lastPaginated = `(last paginated: ${now})`;
  const start = new Date(now.getUTCFullYear(), now.getMonth(), now.getDate()-1)
  const props = {
    from: start.getTime(),
    to: now.getTime()
  }
  if (last) props.lastId = last;
  try{
    const res = await onfleet.tasks.list(props);
    res.tasks.forEach(job => {
      if (job.state < 3) jobArray.push(job)
    })
    if (res.lastId){
      await fullPage(res.lastId, page+1)
    } else {
      lastTask = jobArray[jobArray.length - 1].id
      console.log('\n')
      return jobArray;
    }
  } catch (err){
    rl.close();
    console.log(err)
  }
}

const main = async () => {
  try{
    const jobNum = await prompt('Job number please: ');
    const jobReg = new RegExp(`.*${jobNum}.*`);
    var result;
    var response;
    jobArray.forEach((job) => {
      if(jobReg.test(job.notes)){
        result = job
      }
    })
    if (result){
      if (result.state != 0){
        const worker = await onfleet.workers.retrieve(result.worker)
        response = worker.name
      } else {
        response = 'job unassigned and unsorted'
      }
    } else {
      response = 'typo or delivered or not for today'
    }
    console.log(`\n| >> ${response} << |\n`.bold)
    await prompt('Press any key to continue')
  } catch (err){
    rl.close();
    console.log(err)
  }
}

const menu = async () => {
  try{
    console.log(`OPTIONS\n1. Repaginate ${lastPaginated}\n2. Enter job number for lookup\n3. Exit\n`);
    const selection = await prompt('Selection: '.bold);
    switch (selection){
      case '1':
        await fullPage(lastTask);
        menu();
        break;
      case '2':
        await main();
        menu();
        break;
      case '3':
        rl.close();
        console.log('\nbye!\n\n');
        break;
      default:
        console.log('bad selection bro'.rainbow)
        menu();
    }
  } catch (err){
    rl.close();
    console.log(err)
  }
};

const start = async () => {
  console.log('\nHello!')
  await fullPage();
  menu();
}

start();
