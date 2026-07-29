/**
 * Mirror lexicon — curated data for the LEXICAL fork detectors (D7/D8).
 *
 * This is the deterministic half of the branching tree from "Misinterpreted
 * Since Birth": words with multiple spellings or senses spawn readings. The
 * Mirror cannot hold the whole tree a human lexicon generates — these lists
 * are the bounded, guaranteed part: same input → same forks, no model in the
 * loop. Breadth beyond this comes from the model-proposes path (route_intent
 * with caller-generated hypotheses).
 *
 * Curation rules (they keep SILENT ON CLEAN PROMPTS true):
 *   - No function words (their/there, to/too): too frequent, forks would fire
 *     constantly. Content words only.
 *   - A confusable fires only when the text supports the ALTERNATIVE reading
 *     (altCues) and does NOT support the word's own reading (ownCues).
 *   - A polysemy fork fires only when at least TWO senses have independent
 *     cue support in the same text — one-sided support is not a fork.
 *   - Cues are lowercase; single tokens match whole-word, phrases match by
 *     substring.
 */

export interface ConfusableEntry {
  /** The word as it appears in the text. */
  word: string;
  /** The likely intended word (edit-distance-1 / homophone neighbor). */
  alt: string;
  /** Context cues supporting the ALTERNATIVE reading (fires the fork). */
  altCues: string[];
  /** Context cues supporting the word AS WRITTEN (suppresses the fork). */
  ownCues: string[];
}

export const CONFUSABLES: ConfusableEntry[] = [
  {
    word: 'cast', alt: 'cash',
    altCues: ['pay', 'paid', 'pays', 'paying', 'money', 'withdraw', 'deposit', 'spend', 'atm', 'dollars'],
    ownCues: ['film', 'movie', 'actor', 'actors', 'crew', 'play', 'theater', 'theatre', 'fishing', 'rod', 'reel', 'line', 'plaster', 'arm', 'leg', 'spell', 'vote', 'iron', 'net', 'shadow'],
  },
  {
    word: 'cash', alt: 'cast',
    altCues: ['film', 'movie', 'actors', 'crew', 'theater', 'theatre', 'fishing', 'rod', 'reel', 'plaster', 'spell'],
    ownCues: ['pay', 'paid', 'money', 'withdraw', 'deposit', 'atm', 'register', 'flow'],
  },
  {
    word: 'brake', alt: 'break',
    altCues: ['take a', 'lunch', 'coffee', 'short', 'quick', 'rest', 'deserve'],
    ownCues: ['car', 'pedal', 'bike', 'wheel', 'fluid', 'pads', 'squeal'],
  },
  {
    word: 'break', alt: 'brake',
    altCues: ['pedal', 'slam the', 'pump the', 'squealing'],
    ownCues: ['take a', 'lunch', 'coffee', 'short', 'give me a', 'spring', 'record', 'news'],
  },
  {
    word: 'loose', alt: 'lose',
    altCues: ['game', 'weight', 'money', 'match', 'bet', 'job', 'mind', "don't want to"],
    ownCues: ['screw', 'bolt', 'fitting', 'thread', 'fits', 'clothing', 'ends'],
  },
  {
    word: 'weak', alt: 'week',
    altCues: ['next', 'last', 'every', 'this time', 'days', 'twice a'],
    ownCues: ['muscles', 'signal', 'immune', 'coffee', 'argument', 'password', 'feel'],
  },
  {
    word: 'bare', alt: 'bear',
    altCues: ['with me', 'market', 'hug', 'grizzly', 'in mind'],
    ownCues: ['feet', 'hands', 'minimum', 'walls', 'skin', 'bones'],
  },
  {
    word: 'peace', alt: 'piece',
    altCues: ['of cake', 'of paper', 'of code', 'of the puzzle', 'missing'],
    ownCues: ['world', 'quiet', 'treaty', 'inner', 'mind', 'war'],
  },
  {
    word: 'piece', alt: 'peace',
    altCues: ['world', 'inner', 'treaty', 'and quiet', 'rest in'],
    ownCues: ['of cake', 'of paper', 'of code', 'puzzle', 'missing', 'chess'],
  },
  {
    word: 'principal', alt: 'principle',
    altCues: ['moral', 'basic', 'general', 'in principal', 'matter of'],
    ownCues: ['school', 'office', 'loan', 'amount', 'interest', 'vice'],
  },
  {
    word: 'principle', alt: 'principal',
    altCues: ['school', 'loan', 'interest', 'balance', 'office'],
    ownCues: ['moral', 'basic', 'general', 'first', 'guiding', 'matter of'],
  },
  {
    word: 'board', alt: 'bored',
    altCues: ['i am so', "i'm so", 'getting', 'out of my mind'],
    ownCues: ['meeting', 'members', 'plane', 'flight', 'chess', 'cutting', 'directors', 'game', 'white'],
  },
  {
    word: 'male', alt: 'mail',
    altCues: ['send', 'sent', 'letter', 'post', 'inbox', 'envelope', 'stamp'],
    ownCues: ['female', 'gender', 'adult', 'voice'],
  },
];

export interface PolysemySense {
  /** Stable sense id, e.g. 'financial' */
  id: string;
  /** Short human gloss used in readings and clarifiers. */
  gloss: string;
  /** Context cues supporting this sense. */
  cues: string[];
}

export interface PolysemousEntry {
  word: string;
  senses: PolysemySense[];
}

export const POLYSEMOUS: PolysemousEntry[] = [
  {
    word: 'bank',
    senses: [
      { id: 'financial', gloss: 'the financial institution', cues: ['pay', 'money', 'deposit', 'loan', 'account', 'teller', 'atm', 'cash', 'withdraw', 'branch'] },
      { id: 'river', gloss: 'the riverbank / shore', cues: ['river', 'fishing', 'shore', 'water', 'mud', 'reel', 'rod', 'stream'] },
    ],
  },
  {
    word: 'check',
    senses: [
      { id: 'verify', gloss: 'verify / look at', cues: ['verify', 'make sure', 'look at', 'review', 'confirm', 'status'] },
      { id: 'payment', gloss: 'the payment instrument', cues: ['write', 'deposit', 'cash', 'bounce', 'endorse', 'payable'] },
    ],
  },
  {
    word: 'bill',
    senses: [
      { id: 'invoice', gloss: 'the invoice / amount owed', cues: ['pay', 'monthly', 'electric', 'phone', 'utility', 'due', 'overdue'] },
      { id: 'legislation', gloss: 'the piece of legislation', cues: ['congress', 'senate', 'law', 'vote', 'passed', 'veto'] },
    ],
  },
  {
    word: 'charge',
    senses: [
      { id: 'fee', gloss: 'the fee / billing', cues: ['card', 'fee', 'account', 'pay', 'refund', 'monthly'] },
      { id: 'power', gloss: 'battery / power', cues: ['battery', 'phone', 'power', 'plug', 'cable', 'overnight'] },
    ],
  },
  {
    word: 'draft',
    senses: [
      { id: 'document', gloss: 'a document draft', cues: ['write', 'review', 'essay', 'email', 'edit', 'first', 'final'] },
      { id: 'air', gloss: 'a draft of air / on tap', cues: ['cold', 'window', 'beer', 'chilly', 'door'] },
      { id: 'selection', gloss: 'the sports/selection draft', cues: ['pick', 'team', 'round', 'player', 'nfl', 'nba'] },
    ],
  },
  {
    word: 'pitch',
    senses: [
      { id: 'presentation', gloss: 'the sales/investor pitch', cues: ['investor', 'deck', 'sales', 'startup', 'client', 'meeting'] },
      { id: 'sport', gloss: 'the throw / playing field', cues: ['baseball', 'ball', 'field', 'inning', 'cricket'] },
      { id: 'sound', gloss: 'the musical pitch', cues: ['tone', 'frequency', 'note', 'sing', 'tune'] },
    ],
  },
  {
    word: 'match',
    senses: [
      { id: 'game', gloss: 'the game / contest', cues: ['win', 'play', 'tennis', 'soccer', 'chess', 'tournament'] },
      { id: 'fire', gloss: 'the fire-starting match', cues: ['light', 'strike', 'flame', 'candle', 'box of'] },
      { id: 'pairing', gloss: 'a pairing / correspondence', cues: ['colors', 'socks', 'pair', 'outfit', 'font'] },
    ],
  },
  {
    word: 'book',
    senses: [
      { id: 'reading', gloss: 'the thing you read', cues: ['read', 'chapter', 'author', 'novel', 'pages', 'library'] },
      { id: 'reserve', gloss: 'to reserve', cues: ['flight', 'hotel', 'table', 'appointment', 'ticket', 'room'] },
    ],
  },
  {
    word: 'spring',
    senses: [
      { id: 'season', gloss: 'the season', cues: ['summer', 'winter', 'march', 'april', 'semester', 'bloom'] },
      { id: 'coil', gloss: 'the mechanical spring', cues: ['mattress', 'metal', 'bounce', 'coil', 'compressed'] },
      { id: 'water', gloss: 'the water source', cues: ['hot', 'mineral', 'water', 'natural', 'geyser'] },
    ],
  },
];
