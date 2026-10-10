// Ported 1:1 from src/lib/db.ts so validation rules stay identical between
// the (legacy) client-side data layer and the real server.

/** Usernames: letters (latin or cyrillic), digits, underscore. 3-20 chars. */
const USERNAME_RE = /^[a-zа-яё0-9_]{3,20}$/i;

/** Usernames that are not allowed (country names and similar). */
const BLOCKED_USERNAMES = [
  "россия", "рф", "russia", "сша", "usa", "украина", "ukraine", "беларусь",
  "belarus", "казахстан", "kazakhstan", "германия", "germany", "франция",
  "france", "англия", "england", "великобритания", "unitedkingdom", "uk",
  "япония", "japan", "китай", "china", "индия", "india", "бразилия", "brazil",
  "испания", "spain", "италия", "italy", "польша", "poland", "латвия",
  "latvia", "литва", "lithuania", "эстония", "estonia", "грузия", "georgia",
  "армения", "armenia", "азербайджан", "azerbaijan", "турция", "turkey",
  "израиль", "israel", "египет", "egypt", "канада", "canada", "мексика",
  "mexico", "австралия", "australia", "швейцария", "switzerland", "швеция",
  "sweden", "норвегия", "norway", "финляндия", "finland", "нидерланды",
  "netherlands", "бельгия", "belgium", "австрия", "austria", "чехия",
  "czechia", "сербия", "serbia", "болгария", "bulgaria", "румыния",
  "romania", "венгрия", "hungary", "греция", "greece", "португалия",
  "portugal", "ирландия", "ireland", "дания", "denmark", "кипр", "cyprus",
  "исландия", "iceland", "монголия", "mongolia", "корея", "korea",
  "таиланд", "thailand", "вьетнам", "vietnam", "индонезия", "indonesia",
  "иран", "iran", "ирак", "iraq", "пакистан", "pakistan", "афганистан",
  "afghanistan", "аргентина", "argentina", "чили", "chile", "колумбия",
  "colombia", "перу", "peru",
];

const ADMIN_USERNAME = "drobovikov";
const VERIFY_BOT_USERNAME = "verifybot";

function validateUsername(rawUsername) {
  const username = String(rawUsername || "").trim().toLowerCase();
  if (!USERNAME_RE.test(username)) {
    return { ok: false, error: "Недопустимое имя пользователя" };
  }
  if (BLOCKED_USERNAMES.includes(username)) {
    return { ok: false, error: "Этот username запрещён" };
  }
  return { ok: true, username };
}

module.exports = {
  USERNAME_RE,
  BLOCKED_USERNAMES,
  ADMIN_USERNAME,
  VERIFY_BOT_USERNAME,
  validateUsername,
};
