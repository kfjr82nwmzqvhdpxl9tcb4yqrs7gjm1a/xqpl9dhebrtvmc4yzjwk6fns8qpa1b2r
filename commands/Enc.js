const JsConfuser = require("js-confuser");
const { franceking } = require("../main");

module.exports = {
  name: 'encrypt',
  description: 'Encrypt (obfuscate) a full JavaScript command file using js-confuser.',
  category: 'Developer',
  get flashOnly() {
    return franceking();
  },

  execute: async (king, msg, args) => {
    const fromJid = msg.key.remoteJid;

    // Require a document upload
    const docMsg = msg.message?.documentMessage;
    if (!docMsg) {
      return king.sendMessage(fromJid, {
        text: "📄 Please upload a `.js` file with this command to encrypt it.\n\nExample:\nSend a file and caption it: `encrypt`",
      }, { quoted: msg });
    }

    const mime = docMsg.mimetype || "";
    const fileName = docMsg.fileName || "";

    // Validate it's a JS file
    if (!mime.includes("javascript") && !fileName.endsWith(".js")) {
      return king.sendMessage(fromJid, {
        text: "❌ Only `.js` files are supported for encryption.",
      }, { quoted: msg });
    }

    try {
      // Download the file
      const fileBuffer = await king.downloadMediaMessage(msg);
      const inputCode = fileBuffer.toString("utf-8");

      // Encrypt using js-confuser
      const encryptedCode = await JsConfuser(inputCode, {
        compact: true,
        minify: true,
        renameVariables: true,
        controlFlowFlattening: true,
        preset: "high", // use "medium" if high causes issues
      });

      // Send back encrypted file
      await king.sendMessage(fromJid, {
        document: Buffer.from(encryptedCode, "utf-8"),
        fileName: `encrypted-${fileName}`,
        mimetype: "application/javascript",
        caption: "🔐 *JavaScript file encrypted successfully!*",
      }, { quoted: msg });

    } catch (err) {
      console.error("[ENCRYPT ERROR]", err);
      return king.sendMessage(fromJid, {
        text: "❌ Failed to encrypt the uploaded JavaScript file.",
      }, { quoted: msg });
    }
  }
};
