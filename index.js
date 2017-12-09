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

const errored = (err) => {
  rl.close()
  console.log(err)
}

const fullPage = async ( last=null, page=0 ) => {
  readline.cursorTo(process.stdout, 0);
  process.stdout.write(`waiting...(page ${page.toString().red.bold})`);
  const now = new Date();
  lastPaginated = `(last paginated: ${now})`;
  const start = new Date(now.getUTCFullYear(), now.getMonth(), now.getDate()-1)
  const props = {
    from: start.getTime(),
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
    errored(err);
  }
}

const main = async () => {
  try{
    const jobNum = await prompt('Job number please: ');

    if (!/^\d{8}(?:\d{2})?$/.test(jobNum)){
      console.log('thats not a job number! (exactly 8 digits please)'.rainbow)
      return main();
    }
    const jobReg = new RegExp(`.*${jobNum}.*`);

    const result = jobArray.filter((job) => {
      return jobReg.test(job.notes)
    }).splice(-1)[0];

    var worker;
    const response = result ? (
      result.state != 0 ? (
        worker = await onfleet.workers.retrieve(result.worker),
        worker.name
      ) : 'job unassigned and unsorted'
    ) : 'typo or delivered';

    console.log(`\n| >> ${response} << |\n`.bold)
    await prompt('Press any key to continue')
  } catch (err){
    errored(err);
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
    errored(err);
  }
};

const start = async () => {
  console.log('\nHello!')
  await fullPage();
  menu();
}

start();
