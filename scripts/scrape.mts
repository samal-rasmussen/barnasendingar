import { writeFileSync } from "fs";
import { JSDOM } from "jsdom";
import prettier from "prettier";

const urlPrefix = "https://kvf.fo";

interface Sending {
  img: string;
  title: string;
  url: string;
  partar: Partur[];
}
interface Partur {
  episode: number | null;
  img: string;
  season: number | null;
  title: string;
  url: string;
}

function pretty(html: string): string {
  return prettier.format(html, { parser: "html" });
}

async function run() {
  const sendingarResult = await fetch("https://kvf.fo/vit/sjonvarp/sendingar");
  const sendingarHtml = await sendingarResult.text();
  const sendingarDom = new JSDOM(sendingarHtml);

  const sendingar: Sending[] = [];
  sendingarDom.window.document
    .querySelectorAll(".view-content .views-row")
    .forEach((el) => {
      const img = el.querySelector("img") as HTMLImageElement;
      const a = el.querySelector(".views-field-title a") as HTMLAnchorElement;
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

    const partar: Partur[] = [];
    sendingDom.window.document.querySelectorAll("td").forEach((el) => {
      if (el.children.length === 0) {
        return;
      }
      // console.log(pretty(el.innerHTML));

      const img = el.querySelector("img") as HTMLImageElement;
      const a = el.querySelector(".views-field-title a") as HTMLAnchorElement;
      const seasonNumber = el.querySelector(
        ".views-field-field-n-season .field-content"
      ) as HTMLElement;
      const episodeNumber = el.querySelector(
        ".views-field-field-ra-tal .field-content"
      ) as HTMLElement;

      const partur = {
        episode:
          episodeNumber != null ? Number(episodeNumber.textContent) : null,
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
