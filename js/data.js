// --- 1. 数据结构 (新增 clue 字段用于苏格拉底提示) ---
export const bookData = {
    "p1": {
        audio: "audio/p1_full.mp3",
        knowledge: [
            { key: "truth", diff: 1, word: "Truth", ipa: "/truːθ/", def: "真理；事实", context: "A fact", clue: "Opposite of lie" },
            { key: "universally", diff: 2, word: "Universally", ipa: "/ˌjuː.nɪˈvɜː.səl.i/", def: "普遍地；人人皆知地", context: "Universal truth = 普世真理", clue: "Synonym: Widely, Generally" },
            { key: "acknowledged", diff: 3, word: "Acknowledged", ipa: "/əkˈnɒl.ɪdʒd/", def: "公认的；承认的", context: "Accepted as truth", clue: "Admitted, Recognized" },
            { key: "single", diff: 1, word: "Single", ipa: "/ˈsɪŋ.ɡəl/", def: "单身的", context: "Not married", clue: "Unmarried" },
            { key: "possession", diff: 3, word: "Possession", ipa: "/pəˈzeʃ.ən/", def: "拥有；财产", context: "In possession of = Owning something", clue: "Think of 'Possess' or 'Ownership'" },
            { key: "fortune", diff: 1, word: "Fortune", ipa: "/ˈfɔː.tʃuːn/", def: "大笔财产", context: "A man of fortune = Rich man", clue: "Great wealth / Luck" },
            { key: "want", diff: 1, word: "Want", ipa: "/wɒnt/", def: "缺乏；需要", context: "In want of = Needing", clue: "Need / Lack" },
            { key: "wife", diff: 1, word: "Wife", ipa: "/waɪf/", def: "妻子", context: "Married woman", clue: "Spouse" },
            { key: "syntax_1", type: "syntax", diff: 5, word: "Formal Subject", ipa: "Syntax", def: "It is... that...", context: "形式主语结构。真正的主语是后面的 that 从句。", clue: "The word 'It' is just a placeholder here." }
        ],
        insight: {
            tag: "Irony (反讽)",
            text: "Austen starts with a famous ironic statement. She says it's a 'truth', but she's mocking how society forces rich men to marry."
        }
    },
    "p2": {
        audio: "audio/p2_full.mp3",
        knowledge: [
            { key: "feelings", diff: 1, word: "Feelings", ipa: "/ˈfiː.lɪŋz/", def: "情感", context: "Emotions", clue: "Emotions" },
            { key: "views", diff: 2, word: "Views", ipa: "/vjuːz/", def: "观点", context: "Opinions", clue: "Opinions / Perspectives" },
            { key: "entering", diff: 2, word: "Entering", ipa: "/ˈen.tər.ɪŋ/", def: "进入；搬入", context: "Moving into a new place", clue: "Coming in" },
            { key: "neighbourhood", diff: 2, word: "Neighbourhood", ipa: "/ˈneɪ.bə.hʊd/", def: "街坊四邻", context: "Local area", clue: "Area where people live" },
            { key: "fixed", diff: 3, word: "Fixed", ipa: "/fɪkst/", def: "根深蒂固的；确定的", context: "Fixed in the minds = Firmly believed", clue: "Synonym: Established, Rooted" },
            { key: "minds", diff: 1, word: "Minds", ipa: "/maɪndz/", def: "头脑；想法", context: "In the minds of...", clue: "Thoughts" },
            { key: "families", diff: 1, word: "Families", ipa: "/ˈfæm.əl.iz/", def: "家庭", context: "Local households", clue: "Parents and children" },
            { key: "property", diff: 3, word: "Property", ipa: "/ˈprɒp.ə.ti/", def: "财产；所有物", context: "Rightful property = object to be owned", clue: "Something that belongs to someone" },
            { key: "daughters", diff: 1, word: "Daughters", ipa: "/ˈdɔː.tərz/", def: "女儿", context: "Female children", clue: "Girl children" }
        ],
        insight: {
            tag: "Social Critique",
            text: "Notice the word 'Property'. Austen is criticizing how men were seen as objects to be 'acquired' by families for survival."
        }
    },
    "p3": {
        audio: ["audio/p3_part1.mp3", "audio/p3_part2.mp3", "audio/p3_part3.mp3"],
        knowledge: [
            { key: "heard", diff: 1, word: "Heard", ipa: "/hɜːd/", def: "听说", context: "Past tense of hear", clue: "Listened to" },
            { key: "netherfield", type: "culture", diff: 4, word: "Netherfield Park", ipa: "Place", def: "内瑟菲尔德庄园", context: "Fictional estate name", clue: "Name of the large house nearby" },
            { key: "let", diff: 2, word: "Let", ipa: "/let/", def: "出租 (British English)", context: "To be rented out", clue: "Rented out" }
        ],
        insight: {
            tag: "Character Voice",
            text: "Mrs. Bennet's voice is immediate and urgent. She doesn't say 'Hello', she jumps straight to the gossip."
        },
        ambient: {
            image: "https://upload.wikimedia.org/wikipedia/commons/4/4c/Haddon_Hall_long_gallery.jpg",
            title: "Longbourn Estate",
            desc: "The Bennet family home. A modest estate in Hertfordshire, causing much anxiety for Mrs. Bennet due to the entailment.",
            mood: "🏰 Domestic Anxiety"
        }
    }
};

// Add ambient data to other paragraphs for completeness
bookData.p1.ambient = {
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Pemberley_Chatsworth_House.jpg/640px-Pemberley_Chatsworth_House.jpg",
    title: "Regency Society",
    desc: "19th Century England. Social status was heavily dependent on wealth and marriage.",
    mood: "🎩 Satirical / Witty"
};
bookData.p2.ambient = {
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Empire_style_dress_1800-1815.jpg/365px-Empire_style_dress_1800-1815.jpg",
    title: "Marriage Market",
    desc: "Young ladies were expected to marry well to secure their future.",
    mood: "💍 Expectation"
};
