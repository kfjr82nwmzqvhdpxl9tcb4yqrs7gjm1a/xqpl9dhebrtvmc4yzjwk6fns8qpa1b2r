const JsConfuser = require("js-confuser");
const { franceking } = require("../main");

module.exports = {
  name: 'encrypt',
  description: 'Encrypt (obfuscate) JavaScript code using js-confuser.',
  category: 'Developer',
  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg, args) => {
    const fromJid = msg.key.remoteJid;

    // Handle text-based input
    let inputCode = args.join(" ").trim();

    // Or check if it's a document
    if (!inputCode && msg.message?.documentMessage) {
      const doc = msg.message.documentMessage;
      const mime = doc.mimetype || "";

      if (!mime.includes("javascript") && !doc.fileName.endsWith(".js")) {
        return king.sendMessage(fromJid, {
          text: "❌ Only .js files are supported for encryption.",
        }, { quoted: msg });
      }

      const stream = await king.downloadMediaMessage(msg);
      inputCode = stream.toString("utf-8");
    }

    if (!inputCode) {
      return king.sendMessage(fromJid, {
        text: "❌ Please provide JavaScript code or upload a `.js` file to encrypt.\n\nExample:\n```encrypt const test = () => console.log('Hello')```",
      }, { quoted: msg });
    }

    try {
      const encryptedCode = await JsConfuser(inputCode, {
        compact: true,
        minify: true,
        renameVariables: true,
        controlFlowFlattening: true,
        preset: "medium",
      });

      await king.sendMessage(fromJid, {
        document: Buffer.from(encryptedCode, "utf-8"),
        fileName: "encrypted.js",
        mimetype: "application/javascript",
        caption: "🔐 *JavaScript Encryption Complete!*\n\nEncrypted using `js-confuser`.",
      }, { quoted: msg });

    } catch (err) {
      console.error("[ENCRYPT ERROR]", err);
      return king.sendMessage(fromJid, {
        text: "❌ Failed to encrypt the JavaScript code. Please check your input and try again.",
      }, { quoted: msg });
    }
  }
};
