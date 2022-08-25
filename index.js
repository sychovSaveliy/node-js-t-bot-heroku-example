const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const fetch = require('node-fetch');

/*
    https://morioh.com/p/ed516194c8db
    https://core.telegram.org/bots
    https://github.com/yagop/node-telegram-bot-api

    // POST/GET params, body
    // post with form data, images, Blob

*/

const token = '5519821012:AAH00vNnfUCr58xd6LNwOx9D9gHHyoZ2OEc';
const bot = new TelegramBot(token, {polling: true});

const users = {};


// Вызвать callback если в строке есть '/date'
// if(str.serach('/date')) {}
bot.onText(/\/date/, (msg) => {
    let content = '';
    const chatId = msg.chat.id;
    const action = msg.text.split(' ')[1];
    console.log(action)

    if (action === 'now') {
        content = new Date();
    }

    if (action === 'day') {
        content = new Date().getDay()
    }

    if (action === 'month') {
        content = new Date().getMonth()
    }

    if (content === '') {
        bot.sendMessage(chatId, 'Wrong command', {
            reply_markup: {
                keyboard: [['/date now', '/date day', '/date month']]
            }
        });

        return;
    }

    bot.sendMessage(chatId, content);
});


// bot.on('message', (msg) => {
//   const chatId = msg.chat.id;

//   users[chatId] = {...msg.from}

//   console.log(JSON.stringify(msg.from));

//   bot.sendMessage(chatId, 'Received your message - UPDATED!', {
//     reply_markup: {
//         'keyboard': [['Sample text', 'Second sample'], ['Keyboard'], ['I\'m robot']],
//     }
//   });
// });

// setInterval(() => {
//     for(let userId in users) {
//         bot.sendMessage(userId, `Hi ${users[userId].first_name}!`);
//     }
// }, 10000)



// users.json

// * User wrote msg to bot -> users.json
// { msgFromUserTotal, lastMsgTime, ... }

// * User asked to show all msgs
// * User asked to delete msg -> users.json
// * Remove all info about user -> user.json

const usersDataPath = './users.json';

bot.onText(/\/reportToAll/, (msg) => {
    const userID = msg.from.id;
    const isAdmin = [261745929].includes(userID)

    if (!isAdmin) return;

    fs.readFile(usersDataPath, 'utf8', (err, usersData) => {
        const parsedUsersData = JSON.parse(usersData);

        for (let userID in parsedUsersData) {
            bot.sendMessage(userID, JSON.stringify(parsedUsersData[userID].history));

            fetch(`https://api.openweathermap.org/data/2.5/weather?lat=50.451400&lon=30.472484&appid={insert weather key}`)
            .then(resp => resp.json())
            .then(weather => {
                bot.sendMessage(userID, JSON.stringify(weather, null, '\t'));
            })
        }
    });
});

bot.onText(/\/createFile/, () => {
    console.log('create file');
    fs.writeFile(usersDataPath, JSON.stringify({}, null, '\t'), err => {
        if (err) {
            console.error(err);
        }
    });
})


bot.onText(/\/showMsgs/, (msg) => {
    const userID = msg.from.id;
    fs.readFile(usersDataPath, 'utf8', (err, usersData) => {
        if (!usersData) {
            bot.sendMessage(userID, 'No users in DB!');
            return;
        }

        const parsedUsersData = JSON.parse(usersData);

        let content = '';
        if (parsedUsersData[userID]) {
            content = JSON.stringify(parsedUsersData[userID].history)
        } else {
            content = 'No msgs for user - ' + userID;
        }

        bot.sendMessage(userID, content);
    })
})

bot.onText(/\/deleteInfo/, (msg) => {
    const userID = msg.from.id;

    fs.readFile(usersDataPath, 'utf8', (err, usersData) => {
        if (!usersData) {
            bot.sendMessage(userID, 'No users in DB!');
            return;
        }
        const parsedUsersData = JSON.parse(usersData);

        if (parsedUsersData[userID]) {
            delete parsedUsersData[userID];

            fs.writeFile(usersDataPath, JSON.stringify(parsedUsersData, null, '\t'), err => {
                if (err) {
                    console.error(err);
                }
            });
        }
    })
});

bot.onText(/\/deleteMsg/, (msg) => {
    const userID = msg.from.id;
    const msgId = msg.text.split(' ')[1];

    fs.readFile(usersDataPath, 'utf8', (err, usersData) => {
        if (!usersData) {
            bot.sendMessage(userID, 'No users in DB!');
            return;
        }
        const parsedUsersData = JSON.parse(usersData);

        let content = '';
        if (parsedUsersData[userID]) {
            const originalLength = parsedUsersData[userID].history.length;
            parsedUsersData[userID].history = parsedUsersData[userID].history.filter(msg => msg.message_id !== Number(msgId))

            if (parsedUsersData[userID].history.length === originalLength) {
                content = `No msgs for id: ${msgId}`
            } else {
                fs.writeFile(usersDataPath, JSON.stringify(parsedUsersData, null, '\t'), err => {
                    if (err) {
                        console.error(err);
                    }
                });
    
                content = `Msg id: ${msgId} was deleted.`
            }
        } else {
            content = 'No msgs for user - ' + userID;
        }

        bot.sendMessage(userID, content);
    })
})

bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  // DIRTY HACK
  if (
      msg.text.includes('/deleteMsg') || 
      msg.text.includes('/deleteInfo') ||
      msg.text.includes('/showMsgs') ||
      msg.text.includes('/reportToAll')
      ) {
      return;
  }

   fs.readFile(usersDataPath, 'utf8', (err, usersData) => {
        let parsedUsersData;
        // If file not exist or other error
        if (err) {
            parsedUsersData = {}
        } else {
            parsedUsersData = JSON.parse(usersData);;
        }

        const newMsg = { message_id: msg.message_id, text: msg.text };
        if (parsedUsersData[msg.from.id]) {
            parsedUsersData[msg.from.id].history.push(newMsg);
        } else {
            parsedUsersData[msg.from.id] = {
                history: [newMsg]   
            };
        }

        fs.writeFile(usersDataPath, JSON.stringify(parsedUsersData, null, '\t'), err => {
            if (err) {
                console.error(err);
            }
        });
    });

    bot.sendMessage(chatId, 'Msg was saved.', {
        reply_markup: {
            'keyboard': [['/showMsgs', '/deleteInfo']],
        }
    });
});