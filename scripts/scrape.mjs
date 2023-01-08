import { writeFileSync } from "fs";
import { JSDOM } from "jsdom";
import prettier from "prettier";
const urlPrefix = "https://kvf.fo";
function pretty(html) {
    return prettier.format(html, { parser: "html" });
}
async function run() {
    const sendingarResult = await fetch("https://kvf.fo/vit/sjonvarp/sendingar");
    const sendingarHtml = await sendingarResult.text();
    const sendingarDom = new JSDOM(sendingarHtml);
    const sendingar = [];
    sendingarDom.window.document
        .querySelectorAll(".view-content .views-row")
        .forEach((el) => {
        const img = el.querySelector("img");
        const a = el.querySelector(".views-field-title a");
        const sending = {
            img: img.src,
            title: a.textContent ?? "",
            url: urlPrefix + a.href,
            partar: [],
        };
        sendingar.push(sending);
    });
    for await (const sending of sendingar) {
        const sendingResult = await fetch(sending.url);
        const sendingHtml = await sendingResult.text();
        const sendingDom = new JSDOM(sendingHtml);
        // console.log(sendingHtml);
        const partar = [];
        sendingDom.window.document.querySelectorAll("td").forEach((el) => {
            if (el.children.length === 0) {
                return;
            }
            // console.log(pretty(el.innerHTML));
            const img = el.querySelector("img");
            const a = el.querySelector(".views-field-title a");
            const seasonNumber = el.querySelector(".views-field-field-n-season .field-content");
            const episodeNumber = el.querySelector(".views-field-field-ra-tal .field-content");
            const partur = {
                episode: episodeNumber != null ? Number(episodeNumber.textContent) : null,
                img: img.src,
                season: seasonNumber != null ? Number(seasonNumber.textContent) : null,
                title: a.textContent ?? "",
                url: urlPrefix + a.href,
            };
            partar.push(partur);
        });
        sending.partar = partar.reverse();
    }
    writeFileSync("public/sendingar.json", JSON.stringify(sendingar, null, 2));
}
run();
