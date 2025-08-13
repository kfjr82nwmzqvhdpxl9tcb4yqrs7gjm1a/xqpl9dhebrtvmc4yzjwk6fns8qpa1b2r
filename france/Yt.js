const axios = require("axios");
const endpoint = "https://iloveyt.net/proxy.php";

async function ytdownload(videoUrl) {
  try {
    const res = await axios.post(endpoint, new URLSearchParams({ url: videoUrl }), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://iloveyt.net/en47/",
        "Origin": "https://iloveyt.net",
      },
    });

    const items = res.data?.api?.mediaItems || [];
    if (!items.length) return { mp3: null, mp4: null };

    const audio = items.find(i => i.mediaExtension === "M4A" && i.mediaQuality === "128K");
    const video = items.find(i => i.mediaExtension === "MP4" && i.mediaRes === "640x360");

    const [mp3Res, mp4Res] = await Promise.all([
      audio?.mediaUrl ? axios.get(audio.mediaUrl) : null,
      video?.mediaUrl ? axios.get(video.mediaUrl) : null
    ]);

    return {
      mp3: mp3Res?.data?.fileUrl || null,
      mp4: mp4Res?.data?.fileUrl || null
    };
  } catch (err) {
    console.error("YT Download Error:", err.message);
    return { mp3: null, mp4: null };
  }
}

module.exports = ytdownload;
