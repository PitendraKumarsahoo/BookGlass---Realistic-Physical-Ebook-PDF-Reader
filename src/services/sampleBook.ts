export interface SamplePageContent {
  pageNumber: number;
  chapter?: string;
  title?: string;
  subtitle?: string;
  type: 'cover' | 'title' | 'contents' | 'editorial' | 'colophon';
  body?: string[];
  quote?: {
    text: string;
    author: string;
  };
  footnote?: string;
  diagram?: 'compass' | 'hourglass' | 'tree' | 'constellation';
}

export const SAMPLE_BOOK_META = {
  id: 'sample-book-meditations-v1',
  title: 'Meditations on the Solitude of Reading',
  author: 'Julian V. Sterling',
  year: '1924',
  numPages: 14,
  fileSize: 420000,
};

export const SAMPLE_PAGES: SamplePageContent[] = [
  {
    pageNumber: 1,
    type: 'cover',
    title: 'MEDITATIONS ON READING',
    subtitle: 'An Inquiry into Silence, Paper & the Mind',
    body: ['Julian Vance Sterling', 'First Edition • Paris & London']
  },
  {
    pageNumber: 2,
    type: 'colophon',
    title: 'EX LIBRIS',
    body: [
      'Published in the autumn of 1924 by the Riverside Press.',
      'Typeset in Monotype Bembo upon mold-made archival parchment.',
      'Every book is an intimate conversation between two minds, separated by oceans or centuries, yet bound together by the grain of paper and the cadence of ink.'
    ],
    footnote: 'Printed at the Sign of the Golden Anchor.'
  },
  {
    pageNumber: 3,
    type: 'title',
    title: 'THE SOLITUDE OF THE OPEN PAGE',
    subtitle: 'Prologue to a Quiet Mind',
    body: [
      'There is a particular sanctuary known only to those who open a book in a quiet room while evening settles against the windows.',
      'The outside world, with its hurried clamor and ephemeral anxieties, recedes beyond an invisible threshold. In that stillness, language sheds its mechanical utility and resumes its sacred office: to illuminate the internal architecture of another human soul.'
    ],
    quote: {
      text: 'A room without books is like a body without a soul.',
      author: 'Marcus Tullius Cicero'
    }
  },
  {
    pageNumber: 4,
    type: 'editorial',
    chapter: 'CHAPTER I',
    title: 'The Weight & Texture of Paper',
    body: [
      'The digital screen promises infinite breadth, yet it often denies us depth. In scrolling without end, the mind traverses vast plains of fleeting prose without ever arriving at a permanent shore.',
      'A physical book, conversely, offers boundary and tactile gravity. You hold twenty pages in your left hand and two hundred in your right; your fingers measure the passage of thought not by an abstract percentage, but by the tangible diminishment of the leaf-stack before you.',
      'When the thumb turns a page, the whisper of fiber against fiber announces a threshold crossed—a commitment of attention that cannot be undone by a flick of the finger.'
    ],
    diagram: 'hourglass',
    footnote: '1. On the phenomenology of physical reading surfaces, Cambridge Essays, 1912.'
  },
  {
    pageNumber: 5,
    type: 'editorial',
    chapter: 'CHAPTER I (CONTINUED)',
    title: 'The Geometry of the Two-Page Spread',
    body: [
      'Consider the ancient harmony of the open spread. The eye does not read in isolation; it balances between the left leaf and the right leaf like an acrobat between two poles.',
      'The inner margin—the spine gutter—acts as a restful valley of shadow. Toward this crease, the paper gently bends, casting subtle gradients that remind us of volume, depth, and three-dimensional presence in space.',
      'In this spatial architecture, every paragraph finds its proportionate repose. White space is not empty void; it is the silence without which the musical notes of prose cannot resonate.'
    ],
    quote: {
      text: 'Reading is to the mind what exercise is to the body.',
      author: 'Joseph Addison, The Tatler'
    }
  },
  {
    pageNumber: 6,
    type: 'editorial',
    chapter: 'CHAPTER II',
    title: 'The Architecture of Night Reading',
    body: [
      'Night is the true hour of the reader. When the city slumbers and the street lamps cast long amber shadows across the ceiling, a single incandescent pool of light transforms an ordinary desk into an island of thought.',
      'Within that golden cone of warmth, the printed page glows with soft cream benevolence. The harsh glare of white phosphors is banished; in its place is the tender illumination of candlelight and quiet reflection.',
      'Here, memory works unhindered. The words read by amber lamplight sink deeper into the marrow of consciousness, weaving themselves into the dreams that will shortly follow.'
    ],
    diagram: 'compass',
    footnote: '2. Nocturnal contemplation and cognitive consolidation in classical philosophy.'
  },
  {
    pageNumber: 7,
    type: 'editorial',
    chapter: 'CHAPTER II (CONTINUED)',
    title: 'Silence as an Active Presence',
    body: [
      'Silence is rarely the mere absence of sound. To the reader, silence is a dense and living medium, populated by the cadence of remembered voices and the rustle of turning parchment.',
      'Notice how a single turn of the page punctuates the flow of time. It is a breath drawn between stanzas, a pause in an unspoken dialogue. In that fraction of a second, the intellect gathers itself before entering the next meadow of ideas.',
      'To rush through a book is to wander through an art gallery at a sprint. Wisdom requires leisure; it asks that we linger before sentences that compel us to look up from the page and gaze into the distance.'
    ]
  },
  {
    pageNumber: 8,
    type: 'editorial',
    chapter: 'CHAPTER III',
    title: 'The Living Archive of Thought',
    body: [
      'Every library is a congress of the centuries. Seneca sits beside Montaigne; Virginia Woolf converses across the shelf with William Hazlitt.',
      'When you hold an open volume, you are participating in a tradition that spans five thousand years of human longing. Clay tablets of Sumer, papyrus scrolls of Alexandria, vellum codices of monastic scriptoria—all converge upon this singular act of decoding signs into feeling.',
      'The medium changes, but the essence remains: one consciousness reaching across time to touch another.'
    ],
    diagram: 'tree',
    quote: {
      text: 'To read well, that is, to read true books in a true spirit, is a noble exercise.',
      author: 'Henry David Thoreau, Walden'
    }
  },
  {
    pageNumber: 9,
    type: 'editorial',
    chapter: 'CHAPTER III (CONTINUED)',
    title: 'On the Art of Underlining',
    body: [
      'To mark a book with pencil is to leave a trail of breadcrumbs in the forest of one’s own intellectual evolution.',
      'Returning to a volume read a decade prior, one discovers not merely what the author wrote, but who oneself was when first encountering it. The faint pencil tick in the margin is a mirror reflecting a younger self, astonished by a truth that has now become second nature.',
      'Thus books are double histories: records of the world, and private chronicles of the minds that traveled through them.'
    ],
    footnote: '3. Marginalia as autobiography, The Oxford Literary Review, 1921.'
  },
  {
    pageNumber: 10,
    type: 'editorial',
    chapter: 'CHAPTER IV',
    title: 'The Discipline of Unhurried Thought',
    body: [
      'In an age that equates speed with intelligence and brevity with clarity, the book remains our most radical counterweight.',
      'A great treatise cannot be absorbed in bullet points, nor can an epic poem be summarized without draining it of its vital blood. The journey through chapters is itself the lesson: the gradual building of nuance, the steady climbing of an intellectual mountain.',
      'When we finish a demanding book, we do not merely know more; our capacity for deep attention has been renewed and fortified against the ceaseless distractions of the day.'
    ],
    diagram: 'constellation'
  },
  {
    pageNumber: 11,
    type: 'editorial',
    chapter: 'CHAPTER IV (CONTINUED)',
    title: 'The Sanctuary of Solitude',
    body: [
      'Never confuse solitude with loneliness. Loneliness is the painful longing for companionship; solitude is the rich and fertile joy of one’s own company in the presence of great ideas.',
      'With a book in hand, one is never truly alone. The wisest men and women who ever lived stand ready to share their deepest insights, their sharpest doubts, and their most enduring triumphs.',
      'We emerge from an hour of undisturbed reading refreshed, as though we had walked along an empty seashore at dawn.'
    ],
    quote: {
      text: 'I cannot live without books.',
      author: 'Thomas Jefferson to John Adams'
    }
  },
  {
    pageNumber: 12,
    type: 'editorial',
    chapter: 'EPILOGUE',
    title: 'The Endless Horizon',
    body: [
      'The last page of a good book is always tinged with bittersweet sorrow. The characters have spoken their final lines; the argument has reached its summit; the world so painstakingly constructed begins to fold back into the quiet room.',
      'Yet something indelible remains behind. We close the cover, and though the physical dimensions of the room have not altered by an inch, our internal horizons have expanded to encompass continents.',
      'We set the volume upon the shelf, pause to run our fingers along its spine, and reach forward to draw down the next.'
    ],
    footnote: 'Finis coronat opus — The end crowns the work.'
  },
  {
    pageNumber: 13,
    type: 'colophon',
    title: 'INDEX OF THOUGHTS',
    body: [
      '§ 1. Tactile phenomenology of paper and binding.',
      '§ 2. Optical equilibrium of the double-page folio.',
      '§ 3. Chromatic temperature of evening reading lamps.',
      '§ 4. Temporal cadence of the manual page turn.',
      '§ 5. Continuous consciousness across printed eras.'
    ]
  },
  {
    pageNumber: 14,
    type: 'cover',
    title: 'BOOKGLASS ARCHIVE',
    subtitle: 'Digitally Crafted with Tactile Reverence',
    body: ['Created for readers who cherish the physical soul of books.', 'End of Volume I']
  }
];
