const request = require('request');
var fs = require('fs')

class Discord {
    constructor(webhookUrl, user) {
      this.data = { username: user };
      this.session = request.defaults({
        url: webhookUrl,
      });
    }
  
    send(msg, fpath = null) {
      this.data["content"] = msg;
      if (fpath !== null) {
        this.data["file"] = fs.createReadStream(fpath);
      }
      let r = this.session.post({ formData: this.data }, function (error, response, body) {
        // コールバック
      });
    }
  
    mention(msg, fpath = null) {
      this.send("@everyone\n" + msg, fpath);
    }
  }

module.exports = Discord;