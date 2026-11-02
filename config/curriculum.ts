// Evergreen lessons: each day Athena teaches one idea from a well-known book in
// every selected category that has a curriculum here, alongside the news.
// Ideas are taught in round-robin across books, so consecutive days vary.
// Add books or ideas freely; an idea is only ever taught once.

export interface Book {
  title: string;
  author: string;
  ideas: [name: string, hint: string][];
}

export const curriculum: Record<string, Book[]> = {
  psychology: [
    {
      title: 'Thinking, Fast and Slow',
      author: 'Daniel Kahneman',
      ideas: [
        ['System 1 and System 2', 'fast intuitive thinking vs slow effortful thinking, and when each fails'],
        ['Anchoring', 'an arbitrary first number drags later estimates toward it'],
        ['Availability heuristic', 'we judge frequency by how easily examples come to mind'],
        ['Loss aversion', 'losses hurt roughly twice as much as equal gains please'],
        ['The planning fallacy', 'why projects overrun, and the outside view as the fix'],
        ['Peak-end rule', 'we remember experiences by their peak and their ending, not their length'],
        ['WYSIATI', '"what you see is all there is": confident stories from incomplete information'],
      ],
    },
    {
      title: 'Influence',
      author: 'Robert Cialdini',
      ideas: [
        ['Reciprocity', 'a small unsolicited gift creates a strong urge to repay'],
        ['Commitment and consistency', 'small public commitments push us toward bigger matching ones'],
        ['Social proof', 'under uncertainty we copy what similar people do'],
        ['Scarcity', 'things feel more valuable when they are rare or about to disappear'],
        ['Authority', 'titles, uniforms and expertise signals make us comply'],
        ['Liking', 'we say yes to people who are similar to us, praise us, or cooperate with us'],
      ],
    },
    {
      title: 'Mindset',
      author: 'Carol Dweck',
      ideas: [
        ['Fixed vs growth mindset', 'believing ability is fixed vs developable changes how we handle failure'],
        ['Praising effort vs talent', 'what kind of praise makes people avoid or seek challenges'],
        ['The "not yet" frame', 'treating failure as a stage rather than a verdict'],
        ['Mindset in leadership', 'how fixed-mindset leaders build cultures that hide problems'],
      ],
    },
    {
      title: 'The Righteous Mind',
      author: 'Jonathan Haidt',
      ideas: [
        ['The elephant and the rider', 'intuition leads, reasoning mostly justifies afterwards'],
        ['Moral foundations', 'care, fairness, loyalty, authority, sanctity and liberty, weighted differently by different groups'],
        ['Why political arguments fail', 'arguments aimed at the rider rarely move the elephant'],
        ['Groupishness', 'humans are wired to bind into teams, which both unites and blinds'],
      ],
    },
    {
      title: 'Atomic Habits',
      author: 'James Clear',
      ideas: [
        ['The habit loop', 'cue, craving, response, reward'],
        ['Identity-based habits', 'change who you believe you are, not just what you want to achieve'],
        ['Environment design', 'make good cues obvious and bad cues invisible'],
        ['The two-minute rule', 'shrink a new habit until starting is effortless'],
        ['Compounding of 1% gains', 'small daily improvements and the plateau of latent potential'],
      ],
    },
  ],

  wealth: [
    {
      title: 'The Psychology of Money',
      author: 'Morgan Housel',
      ideas: [
        ['Getting rich vs staying rich', 'different skills: risk-taking vs paranoia and frugality'],
        ['Tail events drive returns', 'a small number of outcomes account for most results'],
        ['Room for error', 'a margin of safety lets you survive long enough for compounding to work'],
        ['"Enough"', 'why moving goalposts make people risk what they have for what they don\'t need'],
        ['Wealth is what you don\'t see', 'the difference between looking rich and being wealthy'],
        ['Reasonable beats rational', 'a plan you can stick with beats an optimal one you abandon'],
      ],
    },
    {
      title: 'The Millionaire Next Door',
      author: 'Thomas Stanley & William Danko',
      ideas: [
        ['Under accumulators vs prodigious accumulators', 'income vs net worth relative to age and earnings'],
        ['Playing offense vs defense', 'earning more vs spending less, and why most wealthy people do both'],
        ['Economic outpatient care', 'how financial gifts to adult children can reduce their wealth'],
        ['Status consumption', 'why high earners in visible professions often have low net worth'],
      ],
    },
    {
      title: 'The Simple Path to Wealth',
      author: 'JL Collins',
      ideas: [
        ['F-you money', 'savings as freedom to make choices, not just a number'],
        ['Savings rate over returns', 'why the share of income you invest matters most early on'],
        ['Wealth preservation vs building phases', 'how asset allocation shifts over a life'],
        ['The 4% rule', 'the safe withdrawal rate research and its limits'],
      ],
    },
    {
      title: 'Die With Zero',
      author: 'Bill Perkins',
      ideas: [
        ['Memory dividends', 'experiences keep paying back through memories'],
        ['Time buckets', 'some experiences only fit certain ages, so plan spending by life stage'],
        ['The cost of over-saving', 'dying with large unspent savings means wasted life energy'],
        ['Health, money and time', 'the trade-off between the three across a lifetime'],
      ],
    },
    {
      title: 'Rich Dad Poor Dad',
      author: 'Robert Kiyosaki',
      ideas: [
        ['Assets vs liabilities', 'the book\'s cash-flow definition and how it differs from accounting'],
        ['Pay yourself first', 'saving and investing before spending, not from what is left'],
        ['Financial literacy as a skill', 'reading income statements and balance sheets for your own life'],
      ],
    },
  ],

  stocks: [
    {
      title: 'The Intelligent Investor',
      author: 'Benjamin Graham',
      ideas: [
        ['Mr. Market', 'the market as a moody partner offering prices you may ignore'],
        ['Margin of safety', 'buying well below estimated value to absorb errors'],
        ['Investment vs speculation', 'Graham\'s definition and why it still matters'],
        ['Defensive vs enterprising investor', 'two strategies based on time and temperament'],
        ['Intrinsic value', 'estimating what a business is worth independent of its price'],
      ],
    },
    {
      title: 'A Random Walk Down Wall Street',
      author: 'Burton Malkiel',
      ideas: [
        ['The efficient market hypothesis', 'weak, semi-strong and strong forms, and the evidence'],
        ['Firm foundation vs castle in the air', 'value-based vs crowd-psychology theories of price'],
        ['Bubbles', 'tulips to dot-com: the common pattern of speculative manias'],
        ['Why most active funds lag the index', 'costs, competition and survivorship bias'],
      ],
    },
    {
      title: 'One Up on Wall Street',
      author: 'Peter Lynch',
      ideas: [
        ['The six stock categories', 'slow growers, stalwarts, fast growers, cyclicals, turnarounds, asset plays'],
        ['Invest in what you know', 'local knowledge as an edge, and its limits'],
        ['The PEG ratio', 'price-to-earnings relative to growth'],
        ['The two-minute story', 'being able to explain why you own a stock'],
      ],
    },
    {
      title: 'Common Stocks and Uncommon Profits',
      author: 'Philip Fisher',
      ideas: [
        ['Scuttlebutt', 'researching a company through customers, suppliers and competitors'],
        ['Quality growth', 'Fisher\'s points for spotting durable, well-managed growers'],
        ['When to sell', 'only when the thesis breaks, rarely because the price rose'],
      ],
    },
    {
      title: 'Valuation basics (Damodaran\'s teaching)',
      author: 'Aswath Damodaran',
      ideas: [
        ['Discounted cash flow', 'a business is worth its future cash flows discounted to today'],
        ['Narrative and numbers', 'every valuation is a story that the numbers must match'],
        ['Cost of capital', 'the hurdle rate and why rising interest rates cut valuations'],
        ['Multiples and their traps', 'P/E, EV/EBITDA, and comparing like with like'],
      ],
    },
  ],

  trading: [
    {
      title: 'Trading in the Zone',
      author: 'Mark Douglas',
      ideas: [
        ['Thinking in probabilities', 'any single trade is random; an edge only shows over many trades'],
        ['Accepting risk before the trade', 'deciding the loss in advance removes fear'],
        ['The consistency mindset', 'why rules followed every time beat good individual calls'],
      ],
    },
    {
      title: 'Market Wizards',
      author: 'Jack Schwager',
      ideas: [
        ['Cut losses, let winners run', 'asymmetric outcomes as the common thread of top traders'],
        ['Position sizing', 'how much to risk per trade matters more than entry timing'],
        ['Having a defined edge', 'top traders know exactly why their method makes money'],
        ['Drawdown management', 'why recovering from a 50% loss needs a 100% gain'],
      ],
    },
    {
      title: 'Technical Analysis of the Financial Markets',
      author: 'John Murphy',
      ideas: [
        ['Support and resistance', 'price levels where buying or selling has repeatedly appeared'],
        ['Trends and trendlines', 'higher highs and higher lows, and what breaks a trend'],
        ['Moving averages', 'smoothing price to read trend, and crossover signals'],
        ['Volume confirmation', 'why moves on heavy volume carry more information'],
        ['Momentum indicators', 'RSI and MACD: what they measure and how they mislead'],
      ],
    },
    {
      title: 'Options as a Strategic Investment',
      author: 'Lawrence McMillan',
      ideas: [
        ['Calls and puts', 'the right to buy or sell, and the payoff shapes'],
        ['Implied volatility', 'what option prices say about expected moves'],
        ['Covered calls', 'trading upside for income, and the hidden risk'],
        ['Protective puts', 'options as insurance and what it costs'],
        ['Time decay', 'theta: why option buyers fight the clock'],
      ],
    },
    {
      title: 'Reminiscences of a Stock Operator',
      author: 'Edwin Lefèvre',
      ideas: [
        ['Sitting tight', '"the big money is in the big swing," not in constant trading'],
        ['Tape reading and the line of least resistance', 'trading with the dominant direction'],
        ['Tips and herd behavior', 'why acting on other people\'s tips ruins traders'],
      ],
    },
  ],

  politics: [
    {
      title: 'Prisoners of Geography',
      author: 'Tim Marshall',
      ideas: [
        ['Russia and the North European Plain', 'a flat invasion corridor and the search for buffer zones'],
        ['China\'s geography', 'the Han heartland, buffer regions, and the first island chain'],
        ['Why the US is a superpower', 'navigable rivers, two oceans and weak neighbours'],
        ['India and Pakistan', 'the Himalayas, the Indus and the Kashmir dispute through geography'],
        ['The Middle East\'s lines in the sand', 'how colonial borders cut across peoples'],
        ['The Arctic', 'melting ice, new shipping routes and competing claims'],
      ],
    },
    {
      title: 'Why Nations Fail',
      author: 'Daron Acemoglu & James Robinson',
      ideas: [
        ['Inclusive vs extractive institutions', 'why some countries grow and others stagnate'],
        ['Critical junctures', 'moments like the Black Death when small institutional differences diverge'],
        ['The iron law of oligarchy', 'why revolutions often replace one elite with another'],
        ['Creative destruction and resistance', 'why elites block innovation that threatens them'],
      ],
    },
    {
      title: 'Destined for War',
      author: 'Graham Allison',
      ideas: [
        ['The Thucydides Trap', 'when a rising power threatens a ruling one, and the historical record'],
        ['Cases where war was avoided', 'what the peaceful power transitions had in common'],
        ['US-China rivalry', 'applying the framework to today'],
      ],
    },
    {
      title: 'Chip War',
      author: 'Chris Miller',
      ideas: [
        ['Chokepoints in the chip supply chain', 'TSMC, ASML and a handful of irreplaceable firms'],
        ['Export controls as weapons', 'how chip restrictions became foreign policy'],
        ['Taiwan\'s silicon shield', 'why chips make Taiwan strategically central'],
      ],
    },
    {
      title: 'The Tragedy of Great Power Politics',
      author: 'John Mearsheimer',
      ideas: [
        ['Offensive realism', 'why great powers seek dominance in an anarchic system'],
        ['The stopping power of water', 'why oceans limit power projection'],
        ['Balancing vs buck-passing', 'how states respond to a rising threat'],
        ['Realism vs liberalism', 'the main schools of international relations compared'],
      ],
    },
  ],

  economy: [
    {
      title: 'Basic Economics',
      author: 'Thomas Sowell',
      ideas: [
        ['Prices as information', 'how prices coordinate millions of decisions'],
        ['Price controls', 'why caps and floors cause shortages and surpluses'],
        ['Incentives over intentions', 'judging policies by results, not goals'],
        ['Opportunity cost', 'the real cost of anything is the next best alternative'],
      ],
    },
    {
      title: 'The Ascent of Money',
      author: 'Niall Ferguson',
      ideas: [
        ['The invention of bonds', 'how government debt funded wars and built bond markets'],
        ['Fractional reserve banking', 'how banks create money, and bank runs'],
        ['Insurance and the welfare state', 'pooling risk from widows\' funds to social security'],
        ['Chimerica', 'the US-China savings and spending imbalance'],
      ],
    },
    {
      title: 'Principles for Dealing with the Changing World Order',
      author: 'Ray Dalio',
      ideas: [
        ['The long-term debt cycle', 'how debt builds over decades and then gets restructured or inflated away'],
        ['Reserve currency status', 'the privileges it brings and how empires lose it'],
        ['Money printing and asset prices', 'what central bank money creation does to markets'],
      ],
    },
    {
      title: 'Capital in the Twenty-First Century',
      author: 'Thomas Piketty',
      ideas: [
        ['r > g', 'when returns on capital exceed growth, wealth concentrates'],
        ['Inherited vs earned wealth', 'the long-run shift between the two'],
        ['The 20th-century compression', 'why wars and policy reduced inequality, and critiques of the thesis'],
      ],
    },
  ],

  ai: [
    {
      title: 'The Alignment Problem',
      author: 'Brian Christian',
      ideas: [
        ['Reward hacking', 'systems optimizing the letter of an objective rather than its intent'],
        ['Bias in training data', 'how models inherit and amplify patterns from data'],
        ['Learning from human feedback', 'teaching models preferences instead of rules'],
        ['Interpretability', 'trying to understand what is happening inside a model'],
      ],
    },
    {
      title: 'Human Compatible',
      author: 'Stuart Russell',
      ideas: [
        ['The standard model of AI and its flaw', 'fixed objectives vs uncertainty about human preferences'],
        ['The off-switch problem', 'why a goal-driven system might resist being stopped'],
        ['Assistance games', 'AI that learns what humans want by observing them'],
      ],
    },
    {
      title: 'Co-Intelligence',
      author: 'Ethan Mollick',
      ideas: [
        ['The jagged frontier', 'AI is superhuman at some tasks and weak at similar-looking ones'],
        ['Centaurs and cyborgs', 'two ways of dividing work between people and AI'],
        ['Always invite AI to the table', 'learning a model\'s strengths through everyday use'],
      ],
    },
    {
      title: 'Deep learning fundamentals',
      author: 'Ian Goodfellow, Yoshua Bengio & Aaron Courville',
      ideas: [
        ['Gradient descent', 'how models learn by nudging weights downhill on a loss'],
        ['Overfitting and generalization', 'memorizing vs learning patterns, and how to tell'],
        ['Embeddings', 'representing words and things as points in space'],
        ['Attention and transformers', 'how models decide which words matter to each other'],
        ['Scaling laws', 'why bigger models and more data predictably improve performance'],
      ],
    },
  ],
};

export interface Idea {
  slug: string;
  name: string;
  hint: string;
  book: Book;
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Every idea for a category, interleaved across books so consecutive days vary. */
export function ideasFor(category: string): Idea[] {
  const books = curriculum[category] ?? [];
  const longest = Math.max(0, ...books.map((b) => b.ideas.length));
  const out: Idea[] = [];
  for (let i = 0; i < longest; i++) {
    for (const book of books) {
      const idea = book.ideas[i];
      if (idea) out.push({ slug: slugify(idea[0]), name: idea[0], hint: idea[1], book });
    }
  }
  return out;
}

export const ideaBySlug = (category: string, slug: string) => ideasFor(category).find((i) => i.slug === slug);
