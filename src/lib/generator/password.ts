// ── Khurklockd Password Generator ──────────────────────────
// CSPRNG password/passphrase generation and strength evaluation.
// Uses crypto.getRandomValues() exclusively — never Math.random().

import type { GeneratorConfig } from "@/types";

// ── Embedded Word Lists ───────────────────────────────────────

/** EFF short word list — 690 diceware words for passphrase generation. */
const EFF_WORDS: readonly string[] = [
  "acid", "acorn", "acre", "acts", "afar", "affix", "aged", "agent", "agile", "aging", "aglow",
  "agony", "ahead", "aide", "aim", "air", "alarm", "alias", "alkali", "alley", "allot", "allow",
  "alloy", "aloft", "alone", "along", "aloof", "aloud", "alpha", "alter", "amber", "ample",
  "angel", "anger", "angle", "angry", "apex", "apply", "apron", "arose", "arts", "aside", "atlas",
  "atom", "attic", "audio", "audit", "aunt", "auto", "avid", "avoid", "awoke", "axis", "axle",
  "babble", "back", "bacon", "badge", "bag", "bait", "bake", "bald", "bale", "balk", "ball",
  "ballot", "balm", "band", "bang", "banjo", "bank", "bar", "barb", "bard", "bare", "barge",
  "bark", "barn", "base", "bash", "basic", "basil", "basin", "basis", "bat", "batch", "bath",
  "baton", "bay", "bead", "beak", "beam", "bean", "bear", "beat", "beau", "bed", "beech", "beef",
  "been", "beep", "beer", "beet", "begin", "being", "bell", "belt", "bench", "bend", "bent",
  "berry", "best", "beta", "bike", "bill", "bin", "birch", "bird", "bit", "bite", "black", "blade",
  "blame", "bland", "blank", "blast", "blaze", "bleak", "blend", "bless", "blew", "blind", "blink",
  "bliss", "blitz", "block", "blond", "blood", "bloom", "blot", "blow", "blue", "bluff", "blunt",
  "blur", "blush", "boa", "board", "boast", "boat", "bog", "boil", "bold", "bolt", "bomb", "bond",
  "bone", "bonus", "book", "boom", "boost", "boot", "border", "bore", "boss", "both", "bounce",
  "bound", "box", "boy", "brace", "brag", "brain", "brake", "bran", "brand", "brass", "brave",
  "bread", "break", "breed", "brick", "bride", "brief", "bright", "brim", "bring", "brisk",
  "broad", "brood", "brow", "brown", "brush", "brute", "bubble", "buck", "bud", "buddy", "budget",
  "bug", "build", "bulb", "bulge", "bulk", "bull", "bully", "bump", "bun", "bunch", "bunt", "buoy",
  "burn", "burst", "bus", "bust", "busy", "butter", "buyer", "buzz", "cabin", "cable", "cactus",
  "cage", "cake", "calf", "call", "calm", "came", "camp", "can", "cane", "canoe", "cape", "captor",
  "car", "carbon", "card", "care", "cargo", "carol", "carry", "carve", "case", "cash", "cast",
  "cave", "cedar", "cell", "cent", "chalk", "champ", "chant", "chaos", "charm", "chart", "chase",
  "cheap", "cheek", "cheer", "chef", "chess", "chest", "chew", "chief", "chill", "chip", "chisel",
  "choke", "chomp", "chop", "chunk", "churn", "cinder", "cite", "city", "clad", "claim", "clam",
  "clamp", "clan", "clank", "clap", "clash", "class", "claw", "clay", "clean", "clear", "cleft",
  "clerk", "click", "cliff", "climb", "cling", "clip", "cloak", "clock", "clog", "clone", "close",
  "cloth", "cloud", "clout", "clove", "clown", "club", "clump", "clung", "coach", "coal", "coast",
  "coat", "cobra", "code", "coil", "coin", "cold", "color", "colt", "comb", "combo", "come",
  "comet", "comfy", "comic", "comma", "conch", "condo", "cone", "conk", "cook", "cool", "cope",
  "copy", "cord", "cork", "corn", "cost", "cosy", "couch", "cough", "cover", "cow", "coyote",
  "crab", "crack", "craft", "cramp", "crane", "crank", "crash", "crater", "crawl", "craze",
  "crazy", "creak", "cream", "credit", "creek", "creep", "crepe", "crest", "crew", "cried",
  "crime", "crisp", "croak", "crop", "cross", "crow", "crowd", "crown", "crumb", "crunch", "crush",
  "crust", "cry", "cube", "cult", "cup", "curb", "cure", "curl", "curry", "curve", "cute", "cycle",
  "dab", "dad", "daily", "dairy", "daisy", "dance", "dandy", "dart", "dash", "data", "date",
  "dawn", "day", "dead", "deal", "dear", "debit", "debt", "debug", "decay", "deck", "decor",
  "decoy", "deed", "deem", "deep", "deer", "delay", "deli", "delta", "demo", "denim", "dense",
  "dent", "depot", "depth", "derby", "desk", "detach", "detail", "detox", "deuce", "device",
  "devote", "dew", "dial", "diary", "dice", "diet", "dig", "digit", "dill", "dim", "dime", "diner",
  "ding", "dip", "dire", "dirt", "disc", "dish", "disk", "ditch", "ditto", "dive", "dizzy", "dock",
  "dodge", "dog", "doll", "dome", "donor", "door", "dose", "dot", "doubt", "dove", "down", "dozen",
  "draft", "drag", "drain", "drank", "drape", "draw", "dread", "dream", "dress", "drew", "dried",
  "drift", "drill", "drink", "drip", "drive", "drone", "drool", "drop", "drove", "drown", "druid",
  "drum", "dry", "dual", "duck", "dude", "dug", "duke", "dull", "dumb", "dump", "dune", "dunk",
  "dusk", "dust", "duty", "dwarf", "dwell", "dye", "dying", "eager", "eagle", "early", "earth",
  "ease", "east", "easy", "eat", "echo", "edge", "edgy", "edit", "eel", "egg", "eight", "elbow",
  "elder", "elect", "elf", "elite", "elk", "elm", "ember", "empty", "end", "enemy", "enjoy",
  "enter", "entry", "envoy", "equal", "erase", "error", "evade", "even", "event", "ever", "evil",
  "evoke", "exact", "exit", "expect", "expel", "extra", "eye", "fable", "face", "fact", "fade",
  "fail", "faint", "fair", "fairy", "faith", "fake", "fall", "false", "fame", "fancy", "fang",
  "far", "farm", "fast", "fat", "fate", "fault", "favor", "fawn", "fear", "feast", "feed", "feel",
  "feet", "fell", "felt", "fence", "fend", "ferry", "fetch", "feud", "fiber", "field", "fiery",
  "fifth", "fifty", "fight", "file", "fill", "film", "final", "find", "fine", "fire", "firm",
  "first", "fish", "fist", "fit", "five", "fix", "flag", "flake", "flame", "flap", "flare",
  "flash", "flat", "flaw", "flea", "fled", "flee", "fleet", "flesh", "flew", "flex", "flick",
  "fling", "flint", "flip", "flirt", "float", "flock", "flood", "floor", "flop", "floss", "flour",
  "flow", "flown", "fluff", "fluid", "fluke", "flume", "flung", "flush", "flute", "fly", "foam",
  "focus", "fog", "foil", "fold", "folk", "follow", "fond", "food", "fool", "foot", "forbid",
  "force", "forge", "forget", "fork", "form", "fort", "forth", "forty", "forum", "foul", "found",
  "fox", "foyer", "frail", "frame", "frank", "fraud", "fray", "free", "freight", "fresh", "fret",
  "fried", "fright", "frog", "from", "front", "frost", "froth", "frown", "froze", "fruit", "fry",
  "fuel",
];

/** Top 100 most common passwords — checked during strength evaluation. */
const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  "123456", "password", "123456789", "12345678", "12345", "1234567", "1234567890", "qwerty",
  "abc123", "football", "monkey", "111111", "letmein", "dragon", "baseball", "sunshine",
  "iloveyou", "trustno1", "princess", "admin", "welcome", "shadow", "master", "passw0rd", "login",
  "starwars", "qwertyuiop", "asdfghjkl", "1q2w3e4r", "654321", "555555", "lovely", "7777777",
  "888888", "123qwe", "michael", "password1", "charlie", "donald", "qwerty123", "121212", "000000",
  "access", "flower", "hello", "hottie", "loveme", "zaq1zaq1", "whatever", "buster", "family",
  "1234", "jordan23", "harley", "ranger", "batman", "thomas", "george", "robert", "buster",
  "hunter", "killer", "soccer", "fender", "andrew", "joshua", "maggie", "matthew", "pepper",
  "summer", "ginger", "heather", "jessica", "ashley", "daniel", "jennifer", "joshua", "matthew",
  "michael", "password", "123123", "987654321", "trustno1", "batman", "superman", "qazwsx",
  "michaels", "asdfgh", "ninja", "mustang", "cheese", "121212", "starwars", "martin", "freedom",
  "ginger", "letmein", "cheese", "pass", "zxcvbnm", "qwerty1", "jordan", "solo",
]);

// ── Character Sets ────────────────────────────────────────────

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const UPPER_AMBIGUOUS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghjkmnpqrstuvwxyz";
const LOWER_AMBIGUOUS = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "23456789";
const DIGITS_AMBIGUOUS = "0123456789";
const DEFAULT_SYMBOLS = "!@#$%^&*()_+-={}[]|;:,.<>?";

// ── Default Config ───────────────────────────────────────────

const DEFAULTS: GeneratorConfig = {
  length: 20,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSymbols: true,
  passphraseMode: false,
  passphraseWordCount: 5,
  passphraseSeparator: "-",
  customSymbols: "",
  excludeAmbiguous: true,
};

// ── CSPRNG Helpers ───────────────────────────────────────────

/**
 * Generate a uniformly-distributed random integer in [0, max).
 * Uses crypto.getRandomValues() with rejection sampling to avoid modulo bias.
 */
function cryptoRandomInt(max: number): number {
  if (max <= 0) return 0;
  // Rejection sampling: generate unbiased values
  const range = Math.floor(0xFFFFFFFF / max) * max;
  const buf = new Uint32Array(1);
  let value: number;
  do {
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= range);
  return value % max;
}

/**
 * Pick a random element from an array using CSPRNG.
 */
function cryptoPick<T>(arr: readonly T[]): T {
  return arr[cryptoRandomInt(arr.length)];
}

/**
 * Fisher-Yates shuffle using CSPRNG.
 * Returns a new array; does not mutate the input.
 */
function cryptoShuffle<T>(arr: readonly T[]): T[] {
  const result = [...arr];
  // Generate enough random values for the entire shuffle
  const randomBuf = new Uint32Array(result.length * 2);
  crypto.getRandomValues(randomBuf);
  let ri = 0;
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomBuf[ri++] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ── Character Set Builders ───────────────────────────────────

interface CharSets {
  sets: Record<string, string>;
  union: string;
}

function buildCharSets(config: GeneratorConfig): CharSets {
  const sets: Record<string, string> = {};
  const parts: string[] = [];

  if (config.includeUppercase) {
    const s = config.excludeAmbiguous ? UPPER : UPPER_AMBIGUOUS;
    sets.upper = s;
    parts.push(s);
  }
  if (config.includeLowercase) {
    const s = config.excludeAmbiguous ? LOWER : LOWER_AMBIGUOUS;
    sets.lower = s;
    parts.push(s);
  }
  if (config.includeNumbers) {
    const s = config.excludeAmbiguous ? DIGITS : DIGITS_AMBIGUOUS;
    sets.digits = s;
    parts.push(s);
  }
  if (config.includeSymbols) {
    const s = config.customSymbols || DEFAULT_SYMBOLS;
    sets.symbols = s;
    parts.push(s);
  }

  const union = parts.join("");
  return { sets, union };
}

// ── Public API ───────────────────────────────────────────────

/**
 * Generate a cryptographically random password.
 *
 * Guarantees at least one character from each enabled character set,
 * then fills the remaining length from the full union pool.
 * The final result is Fisher-Yates shuffled so guaranteed characters
 * are not clustered at predictable positions.
 */
export function generatePassword(config: Partial<GeneratorConfig> = {}): string {
  const cfg: GeneratorConfig = { ...DEFAULTS, ...config };

  // Passphrase mode — delegate
  if (cfg.passphraseMode) {
    return generatePassphrase(
      cfg.passphraseWordCount,
      cfg.passphraseSeparator,
      false,
      false,
    );
  }

  const { sets, union } = buildCharSets(cfg);
  const enabledSets = Object.values(sets);

  // Edge case: no character sets enabled
  if (enabledSets.length === 0) {
    return "";
  }

  const length = Math.max(1, cfg.length);
  const chars: string[] = [];

  // Step 1: guarantee one char from each enabled set
  for (const set of enabledSets) {
    chars.push(cryptoPick([...set]));
  }

  // Step 2: fill remaining positions from the full union
  while (chars.length < length) {
    chars.push(cryptoPick([...union]));
  }

  // Step 3: trim to exact length (in case we overshot — should not happen)
  // then Fisher-Yates shuffle so guaranteed chars aren't at the start
  return cryptoShuffle(chars.slice(0, length)).join("");
}

/**
 * Generate a passphrase from the EFF short word list.
 *
 * @param wordCount  Number of words (default 5).
 * @param separator  Word separator (default "-").
 * @param capitalize Whether to capitalize each word (default false).
 * @param includeNumber Whether to append a random 2-digit number (default false).
 */
export function generatePassphrase(
  wordCount: number = 5,
  separator: string = "-",
  capitalize: boolean = false,
  includeNumber: boolean = false,
): string {
  const count = Math.max(1, Math.min(wordCount, 50));
  const words: string[] = [];

  for (let i = 0; i < count; i++) {
    let word = cryptoPick(EFF_WORDS);
    if (capitalize) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }
    words.push(word);
  }

  let result = words.join(separator);

  if (includeNumber) {
    const num = cryptoRandomInt(90) + 10; // 10–99
    result += separator + String(num);
  }

  return result;
}

// ── Strength Meter ───────────────────────────────────────────

export interface StrengthResult {
  score: number;
  label: string;
  color: string;
  feedback: string;
}

const STRENGTH_LABELS: Record<number, string> = {
  0: "Very Weak",
  1: "Weak",
  2: "Fair",
  3: "Strong",
  4: "Very Strong",
};

const STRENGTH_COLORS: Record<number, string> = {
  0: "#ef4444",
  1: "#f59e0b",
  2: "#f59e0b",
  3: "#22c55e",
  4: "#22c55e",
};

/**
 * Evaluate password strength using heuristics.
 *
 * Checks:
 *  1. Against the top 100 common passwords — instant score 0.
 *  2. Length and character-type diversity.
 *
 * Returns a score 0-4 with label, color, and human-readable feedback.
 */
export function calculateStrength(password: string): StrengthResult {
  // Clamp check against common passwords
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return {
      score: 0,
      label: STRENGTH_LABELS[0],
      color: STRENGTH_COLORS[0],
      feedback: "This is one of the most common passwords. Choose something unique.",
    };
  }

  const len = password.length;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  const charTypes = [hasUpper, hasLower, hasDigit, hasSymbol].filter(Boolean).length;

  let score: number;

  if (len < 8) {
    score = 0;
  } else if (len >= 8 && charTypes === 1) {
    score = 1;
  } else if (len >= 10 && charTypes >= 2) {
    score = 2;
  } else if (len >= 14 && charTypes >= 3) {
    score = 3;
  } else if (len >= 18 && charTypes >= 4) {
    score = 4;
  } else if (len >= 8 && charTypes === 2) {
    score = 1;
  } else if (len >= 10 && charTypes === 1) {
    score = 1;
  } else {
    score = 0;
  }

  const missing: string[] = [];
  if (!hasUpper) missing.push("uppercase letters");
  if (!hasLower) missing.push("lowercase letters");
  if (!hasDigit) missing.push("numbers");
  if (!hasSymbol) missing.push("symbols");

  let feedback: string;
  if (score === 0) {
    if (len < 8) {
      feedback = "Too short. Use at least 8 characters.";
    } else if (missing.length === 4) {
      feedback = "Add at least one character type (letters, numbers, or symbols).";
    } else {
      feedback = `Add variety — try including ${missing.join(", ")}.`;
    }
  } else if (score === 1) {
    if (len < 10) {
      feedback = `Longer is stronger. Try at least 10 characters and add ${missing.join(" or ")}.`;
    } else {
      feedback = `Mix in ${missing.join(" and ")} for better security.`;
    }
  } else if (score === 2) {
    if (missing.length > 0) {
      feedback = `Good start! Add ${missing.join(" and ")} to reach the next level.`;
    } else {
      feedback = "Decent. A longer password (14+ characters) would be even stronger.";
    }
  } else if (score === 3) {
    if (missing.length > 0) {
      feedback = `Strong! Adding ${missing.join(" or ")} would make it nearly unbreakable.`;
    } else {
      feedback = "Strong password. Go for 18+ characters with all character types for maximum strength.";
    }
  } else {
    feedback = "Excellent! This password is very resistant to brute-force attacks.";
  }

  return {
    score,
    label: STRENGTH_LABELS[score],
    color: STRENGTH_COLORS[score],
    feedback,
  };
}
