const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
    config: {
        name: 'mts',
        version: '1.2.0',
        hasPermssion: 0,
        credits: 'Dũngkon',
        description: 'Game ma trận số, tìm ký tự khác biệt!',
        usages: '[mts]',
        cooldowns: 5,
        commandCategory: 'game'
    },

    handleReply: async function ({ api, event, handleReply }) {
        if (!event.body) return;
        const userAnswer = event.body.trim();

        if (!global.client.handleReply.some(e => e.messageID === handleReply.messageID)) {
            return api.sendMessage(`⏳ Bạn đã hết thời gian! Trò chơi này đã kết thúc.`, event.threadID, event.messageID);
        }

        if (userAnswer.toLowerCase() === "gợi ý") {
            return api.sendMessage(`💡 Gợi ý: ${handleReply.suggestions}`, event.threadID, event.messageID);
        }

        if (userAnswer === handleReply.correctChar) {
            clearTimeout(handleReply.timeout); 

            global.client.handleReply = global.client.handleReply.filter(e => e.messageID !== handleReply.messageID);

            return api.sendMessage(`🎉 Chính xác! Ký tự đặc biệt là: "${handleReply.correctChar}"`, event.threadID, event.messageID);
        } else {
            return api.sendMessage(`❌ Sai rồi! Thử lại lần sau nhé!`, event.threadID, event.messageID);
        }
    },
//http://localhost:8010/game/mts
    run: async function ({ api, event }) {
        try {
            const res = await axios.get('https://api.sumiproject.net/game/mts');
            const data = res.data.dataGame;

            if (!data || !data.link || !data.so) {
                return api.sendMessage('❌ API không trả về dữ liệu hợp lệ!', event.threadID, event.messageID);
            }

            const { so, link, suggestions } = data;
            const imagePath = path.join(__dirname, 'cache', `matrixgame_${event.threadID}.jpg`);

            const response = await axios({
                url: link,
                responseType: 'stream'
            });

            const writer = fs.createWriteStream(imagePath);
            response.data.pipe(writer);

            writer.on('finish', () => {
                api.sendMessage(
                    {
                        body: `🕵️‍♂️ Hãy tìm ký tự khác biệt trong ma trận!\n⏳ Reply tin nhắn này với ký tự bạn tìm thấy (20 giây).\n💡 Gõ "Gợi ý" để nhận trợ giúp.`,
                        attachment: fs.createReadStream(imagePath)
                    },
                    event.threadID,
                    (err, info) => {
                        if (!err) {
  
                            const timeout = setTimeout(() => {
                                api.sendMessage(`⏳ Hết thời gian! Bạn đã thua!`, event.threadID);

                                global.client.handleReply = global.client.handleReply.filter(e => e.messageID !== info.messageID);
                            }, 20000);

                            global.client.handleReply.push({
                                name: this.config.name,
                                messageID: info.messageID,
                                author: event.senderID,
                                correctChar: so,
                                suggestions: suggestions,
                                timeout: timeout 
                            });
                        }
                        
                        setTimeout(() => fs.unlinkSync(imagePath), 30000);
                    },
                    event.messageID
                );
            });
        } catch (error) {
            console.error(error);
            return api.sendMessage('⚠ Lỗi khi lấy dữ liệu từ API!', event.threadID, event.messageID);
        }
    }
};