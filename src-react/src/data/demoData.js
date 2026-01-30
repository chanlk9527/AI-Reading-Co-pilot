/**
 * Demo book data with sample paragraphs and vocabulary
 */
export const demoBookData = {
    'p1': {
        knowledge: [
            { key: 'truth', word: 'truth', ipa: '/truːθ/', def: '真理', clue: 'Fact accepted as certain', diff: 2, context: 'a truth universally acknowledged' },
            { key: 'universally', word: 'universally', ipa: '/juːnɪˈvɜːsəli/', def: '普遍地', clue: 'By everyone, everywhere', diff: 3, context: 'universally acknowledged' },
            { key: 'acknowledged', word: 'acknowledged', ipa: '/əkˈnɒlɪdʒd/', def: '公认的', clue: 'Accepted, Recognized', diff: 4, context: 'truth universally acknowledged' },
            { key: 'single', word: 'single', ipa: '/ˈsɪŋɡl/', def: '单身的', clue: 'Unmarried, Alone', diff: 1, context: 'a single man' },
            { key: 'possession', word: 'possession', ipa: '/pəˈzeʃn/', def: '拥有', clue: 'Ownership, Having', diff: 3, context: 'in possession of' },
            { key: 'fortune', word: 'fortune', ipa: '/ˈfɔːtʃuːn/', def: '财富', clue: 'Wealth, Riches', diff: 2, context: 'a good fortune' },
            { key: 'want', word: 'want', ipa: '/wɒnt/', def: '需要（此处）', clue: 'Need, Lack (archaic)', diff: 4, context: 'in want of' },
            { key: 'wife', word: 'wife', ipa: '/waɪf/', def: '妻子', clue: 'Spouse, Partner', diff: 1, context: 'in want of a wife' }
        ],
        insight: { tag: 'Irony', text: 'Jane Austen opens with a statement presented as universal truth but is actually satirical commentary on societal obsession with marriage and wealth.' },
        ambient: null,
        translation: '凡是有钱的单身汉，总想娶位太太，这已经成了一条举世公认的真理。'
    },
    'p2': {
        knowledge: [
            { key: 'feelings', word: 'feelings', ipa: '/ˈfiːlɪŋz/', def: '感情', clue: 'Emotions', diff: 1, context: 'feelings or views' },
            { key: 'views', word: 'views', ipa: '/vjuːz/', def: '观点', clue: 'Opinions, Perspectives', diff: 2, context: 'feelings or views' },
            { key: 'entering', word: 'entering', ipa: '/ˈentərɪŋ/', def: '进入', clue: 'Coming into', diff: 1, context: 'entering a neighbourhood' },
            { key: 'neighbourhood', word: 'neighbourhood', ipa: '/ˈneɪbəhʊd/', def: '邻里/社区', clue: 'Local community', diff: 2, context: 'entering a neighbourhood' },
            { key: 'fixed', word: 'fixed', ipa: '/fɪkst/', def: '根深蒂固的', clue: 'Firmly established', diff: 3, context: 'so well fixed in the minds' },
            { key: 'minds', word: 'minds', ipa: '/maɪndz/', def: '头脑', clue: 'Thoughts', diff: 1, context: 'fixed in the minds' },
            { key: 'families', word: 'families', ipa: '/ˈfæmɪliz/', def: '家庭', clue: 'Households', diff: 1, context: 'surrounding families' },
            { key: 'property', word: 'property', ipa: '/ˈprɒpəti/', def: '财产', clue: 'Possession (ironic: treating man as object)', diff: 3, context: 'rightful property' },
            { key: 'daughters', word: 'daughters', ipa: '/ˈdɔːtəz/', def: '女儿', clue: 'Female children', diff: 1, context: 'their daughters' }
        ],
        insight: { tag: 'Social Commentary', text: 'Austen satirizes how society reduces wealthy bachelors to commodities, immediately earmarked as "property" for eligible daughters, revealing the transactional nature of marriage.' },
        ambient: null,
        translation: '虽然这人初来乍到，谁都不了解他的性情见解，但这真理早已在邻居心目中根深蒂固，认为他理所应当是某家女儿的财产。'
    },
    'p3': {
        knowledge: [
            { key: 'heard', word: 'heard', ipa: '/hɜːd/', def: '听说', clue: 'Past of hear', diff: 1, context: 'have you heard' },
            { key: 'netherfield', word: 'Netherfield Park', ipa: '/ˈneðəfiːld pɑːk/', def: '内瑟菲尔德庄园', clue: 'Estate name (fictional)', diff: 5, context: 'Netherfield Park is let' },
            { key: 'let', word: 'let', ipa: '/let/', def: '出租', clue: 'Rented out (British)', diff: 3, context: 'is let at last' }
        ],
        insight: { tag: 'Dialogue', text: "Mrs. Bennet's opening line immediately establishes her character - gossip-driven and focused on eligible bachelors for her daughters." },
        ambient: null,
        translation: '"亲爱的贝内特先生，"有一天他太太对他说，"你听说内瑟菲尔德庄园终于租出去了吗？"'
    }
};

// Demo paragraphs for initial display (plain text, keywords wrapped dynamically by Paragraph component)
export const demoParagraphs = [
    {
        id: 'p1',
        text: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
        ...demoBookData['p1']
    },
    {
        id: 'p2',
        text: 'However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.',
        ...demoBookData['p2']
    },
    {
        id: 'p3',
        text: '"My dear Mr. Bennet," said his lady to him one day, "have you heard that Netherfield Park is let at last?"',
        ...demoBookData['p3']
    }
];
