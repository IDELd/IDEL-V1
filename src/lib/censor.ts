/**
 * Basic profanity filter ("censor"). Replaces common Russian swear words and
 * insults with polite alternatives. The admin can toggle the whole filter from
 * the Admin Panel; when enabled it is applied to every post and comment at
 * write time.
 */

const DICT: Array<[string, string]> = [
    ["блядь", "пожалуйста"],
    ["бля", "пожалуйста"],
    ["хуй", "спасибо"],
    ["хуя", "спасибо"],
    ["хуе", "спасибо"],
    ["нахуй", "пожалуйста"],
    ["пиздец", "золотце"],
    ["пизда", "извините"],
    ["пизд", "извините"],
    ["охуеть", "невероятно"],
    ["охуен", "прекрасно"],
    ["ебать", "удивительно"],
    ["ебан", "дружочек"],
    ["ебаш", "пожалуйста"],
    ["ебло", "милашка"],
    ["мудак", "уважаемый"],
    ["идиот", "пожалуйста"],
    ["дебил", "милашка"],
    ["дурак", "уважаемый"],
    ["урод", "солнышко"],
    ["гандон", "пожалуйста"],
    ["шлюха", "милашка"],
    ["сука", "уважаемый"],
    ["тварь", "дружочек"],
    ["мразь", "пожалуйста"],
    ["сволочь", "уважаемый"],
    ["кретин", "милашка"],
    ["залупа", "спасибо"],
    ["уебан", "золотце"],
    ["хуесос", "спасибо"],
    ["долбоеб", "золотце"],
    ["заебал", "пожалуйста"],
    ["разъеб", "извините"],
  ];
  
  export function censorText(input: string): { text: string; changed: boolean } {
    let text = input;
    let changed = false;
    for (const [bad, polite] of DICT) {
      if (text.toLowerCase().includes(bad)) {
        changed = true;
        text = text.replace(new RegExp(bad, "gi"), polite);
      }
    }
    return { text, changed };
  }
  