const cron = require('node-cron');
const express = require('express');
const fs = require('fs');
const uuid = require('uuid');
const app = express();

// Use express to serve static files
app.use(express.static('public'));

// Use express to parse the user input from the form
app.use(express.urlencoded({ extended: true }));

// Create an object to store all the cron jobs
const cronJobs = {};

// Create a route for the root path and send the index.html file
app.get('/', (req, res) => {
  res.sendFile('index.html');
});

app.get('/tasks.json', (req, res) => {
  res.sendFile(__dirname + '/tasks.json');
});


// Create a route to handle the user input and schedule a task
app.post('/schedule', (req, res) => {
  // Get the user input from the request body
  const code = req.body.code;
  const cronExpression = req.body.cron;

  // Validate and sanitize the user input
  // You can use regex, try-catch, or other methods to check the user input
  // For simplicity, this example only checks if the user input is not empty
  if (code && cronExpression) {
    // Generate a unique id for the task
    const taskId = uuid.v4();

    // Create an object to store the task details
    const task = {
      id: taskId,
      code: code,
      cron: cronExpression,
      status: 'scheduled',
      count: 0,
      limit: 10,
      lastRun: null,
      update: function (newStatus) {
        // Update the status of the task in tasks.json file
        fs.readFile('tasks.json', 'utf8', (err, data) => {
          if (err) {
            console.error(err);
          } else {
            // Parse the JSON data
            const tasks = JSON.parse(data);

            // Find and update the task by id
            const index = tasks.findIndex((task) => task.id === this.id);
            if (index !== -1) {
              tasks[index].status = newStatus;

              // Write back to tasks.json file
              fs.writeFile('tasks.json', JSON.stringify(tasks), 'utf8', (err) => {
                if (err) {
                  console.error(err);
                } else {
                  console.log(`Task ${this.id} updated successfully.`);
                }
              });
            }
          }
        });
      },
      destroy: function () {
        // Stop and delete the cron job by id
        if (cronJobs[this.id]) {
          cronJobs[this.id].stop();
          delete cronJobs[this.id];
          console.log(`Task ${this.id} stopped and deleted successfully.`);
        }
      },
    };

    // Append the task to tasks.json file
    fs.readFile('tasks.json', 'utf8', (err, data) => {
      if (err) {
        console.error(err);
      } else {
        // Parse the JSON data
        const tasks = JSON.parse(data);

        // Push the new task to the array
        tasks.push(task);

        // Write back to tasks.json file
        fs.writeFile('tasks.json', JSON.stringify(tasks), 'utf8', (err) => {
          if (err) {
            console.error(err);
          } else {
            console.log(`Task ${taskId} added successfully.`);
          }
        });
      }
    });

    // Send a response to the user
   res.send(`Your task has been scheduled successfully.`);
    //res.redirect('/tasks');
  } else {
    // Send an error message to the user
    res.send(`Invalid input. Please try again.`);
  }
});

// Create a route to start a specific task by id
app.post('/start/:id', (req, res) => {
  // Get the task id from the request parameter
  const taskId = req.params.id;

  // Read the tasks.json file
  fs.readFile('tasks.json', 'utf8', (err, data) => {
    if (err) {
      console.error(err);
    } else {
      // Parse the JSON data
      const tasks = JSON.parse(data);

      // Find the task by id
      const task = tasks.find((task) => task.id === taskId);

      // Check if the task exists and is not completed
      if (task && task.status !== 'completed') {
        // Create a cron job for the task using node-cron and eval
        const job = cron.schedule(task.cron, () => {
          // Execute the user input as javascript code or function
          // You can use eval or Function constructors to do that
  // For simplicity, this example only uses eval
  eval(task.code);

  // Increment the count of the task
  task.count++;

  // Update the last run time of the task
  task.lastRun = new Date();

  // Check if the task has reached its limit
  if (task.count >= task.limit) {
    // Stop and delete the cron job
    job.stop();
    delete cronJobs[task.id];

    // Update the status of the task to completed
    task.update('completed');

    // Print and send a message to the user
    const message = `Task completed --> ${task.id}`;
    console.log(message);
    res.send(message);
  }
});

// Start the cron job
job.start();

// Store the cron job in the cronJobs object by id
cronJobs[task.id] = job;

// Update the status of the task to running
task.update('running');

// Send a response to the user
res.send(`Task ${task.id} started successfully.`);
      } else {
        // Send an error message to the user
        res.send(`Task not found or already completed.`);
      }
    }
  });
});

// Create a route to stop a specific task by id
app.delete('/stop/:id', (req, res) => {
  // Get the task id from the request parameter
  const taskId = req.params.id;

  // Read the tasks.json file
  fs.readFile('tasks.json', 'utf8', (err, data) => {
    if (err) {
      console.error(err);
    } else {
      // Parse the JSON data
      const tasks = JSON.parse(data);

      // Find the task by id
      const task = tasks.find((task) => task.id === taskId);

      // Check if the task exists and is running
      if (task && task.status === 'running') {
        // Stop and delete the cron job by id
        if (cronJobs[task.id]) {
          cronJobs[task.id].stop();
          delete cronJobs[task.id];
          console.log(`Task ${task.id} stopped and deleted successfully.`);
        }

        // Update the status of the task to stopped
        task.update('stopped');

        // Send a response to the user
        res.send(`Task ${task.id} stopped successfully.`);
      } else {
        // Send an error message to the user
        res.send(`Task not found or not running.`);
      }
    }
  });
});

// Create a route to resume a specific task by id
app.put('/resume/:id', (req, res) => {
  // Get the task id from the request parameter
  const taskId = req.params.id;

  // Read the tasks.json file
  fs.readFile('tasks.json', 'utf8', (err, data) => {
    if (err) {
      console.error(err);
    } else {
      // Parse the JSON data
      const tasks = JSON.parse(data);

      // Find the task by id
      const task = tasks.find((task) => task.id === taskId);

      // Check if the task exists and is stopped
      if (task && task.status === 'stopped') {
        // Create a new cron job for the task using node-cron and eval
        const job = cron.schedule(task.cron, () => {
          // Execute the user input as javascript code or function
          eval(task.code);

          // Increment the count of the task
          task.count++;

          // Update the last run time of the task
          task.lastRun = new Date();

          // Check if the task has reached its limit
          if (task.count >= task.limit) {
            // Stop and delete the cron job
            job.stop();
            delete cronJobs[task.id];

            // Update the status of the task to completed
            task.update('completed');

            // Print and send a message to the user
            const message = `Task completed --> ${task.id}`;
            console.log(message);
            res.send(message);
          }
        });

        // Start the cron job
        job.start();

         // Store the cron job in the cronJobs object by id
         cronJobs[task.id] = job;

         // Update the status of the task to running
         task.update('running');
         // Send a response to the user
res.send(`Task ${task.id} resumed successfully.`);
} else {
  // Send an error message to the user
  res.send(`Task not found or not stopped.`);
}
}
});
});

// Create a server using express and listen on port 3000
app.listen(3000, () => {
console.log('Server is running on port 3000');
});