import { toHiragana } from "wanakana";
const newSource = (e) => {
    const r = document.createElement("source");
    return (
      r.setAttribute("src", e.url),
      r.setAttribute("content_type", e.content_type),
      r
    );
  },
  getSources = ({
    subject: e,
    questionType: r,
    answer: t,
    results: n,
    preferredVoiceActorId: o,
  }) => {
    let a = [];
    if ("reading" === r && e.readings) {
      let r = n.passed ? t : e.readings[0].reading,
        i = e.readings.find((e) => e.reading === r);
      if (
        (i ||
          ((r = toHiragana(r, { convertLongVowelMark: !1 })),
          (i = e.readings.find((e) => e.reading === r))),
        i)
      ) {
        const e = i.pronunciations.find((e) => e.actor.id === o);
        e && (a = e.sources.map((e) => newSource(e)));
      }
    }
    return a;
  };
export { getSources };
