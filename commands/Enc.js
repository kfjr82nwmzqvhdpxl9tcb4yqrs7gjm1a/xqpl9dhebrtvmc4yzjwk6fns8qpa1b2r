const JsConfuser = require("js-confuser");
const { franceking } = require("../main");

module.exports = {
  name: 'encrypt',
  description: 'Encrypt (obfuscate) raw JavaScript code sent as a message using js-confuser.',
  category: 'Developer',
  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg, args) => {
    const fromJid = msg.key.remoteJid;

    // Try to get long multi-line input
    let inputCode = "";

    // If this is a reply to a message, extract the replied text
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quotedMsg?.conversation) {
      inputCode = quotedMsg.conversation.trim();
    } else if (msg.message?.conversation) {
      inputCode = msg.message.conversation.replace(/^encrypt\s+/i, "").trim();
    } else if (args.length > 0) {
      inputCode = args.join(" ").trim();
    }

    if (!inputCode || inputCode.length < 10) {
      return king.sendMessage(fromJid, {
        text: "❌ Please send valid JavaScript code with the command, or reply to a message containing JS code.\n\nExample:\n```encrypt const x = () => console.log('Hello World'); x();```",
      }, { quoted: msg });
    }

    try {
      const encryptedCode = await JsConfuser(inputCode, {
        compact: true,
        minify: true,
        renameVariables: true,
        controlFlowFlattening: true,
        preset: "medium", // adjust if needed
      });

      await king.sendMessage(fromJid, {
        document: Buffer.from(encryptedCode, "utf-8"),
        fileName: "encrypted.js",
        mimetype: "application/javascript",
        caption: "🔐 *JavaScript encryption complete!*",
      }, { quoted: msg });

    } catch (err) {
      console.error("[ENCRYPT ERROR]", err);
      return king.sendMessage(fromJid, {
        text: "❌ Failed to encrypt your JavaScript code. Please check your syntax and try again.",
      }, { quoted: msg });
    }
  }
};
