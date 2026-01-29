// --- 1. 数据结构 (新增 clue 字段用于苏格拉底提示) ---
export const bookData = {
    "p1": {
        knowledge: [
            { key: "universally", diff: 2, word: "Universally", ipa: "/ˌjuː.nɪˈvɜː.səl.i/", def: "普遍地；人人皆知地", context: "Universal truth = 普世真理", clue: "Synonym: Widely, Generally" },
            { key: "possession", diff: 3, word: "Possession", ipa: "/pəˈzeʃ.ən/", def: "拥有；财产", context: "In possession of = Owning something", clue: "Think of 'Possess' or 'Ownership'" },
            { key: "fortune", diff: 1, word: "Fortune", ipa: "/ˈfɔː.tʃuːn/", def: "大笔财产", context: "A man of fortune = Rich man", clue: "Great wealth / Luck" },
            { key: "syntax_1", type: "syntax", diff: 4, word: "Formal Subject", ipa: "Syntax", def: "It is... that...", context: "形式主语结构。真正的主语是后面的 that 从句。", clue: "The word 'It' is just a placeholder here." }
        ],
        insight: {
            tag: "Irony (反讽)",
            text: "Austen starts with a famous ironic statement. She says it's a 'truth', but she's mocking how society forces rich men to marry."
        }
    },
    "p2": {
        knowledge: [
            { key: "entering", diff: 2, word: "Entering", ipa: "/ˈen.tər.ɪŋ/", def: "进入；搬入", context: "Moving into a new place", clue: "Coming in" },
            { key: "fixed", diff: 3, word: "Fixed", ipa: "/fɪkst/", def: "根深蒂固的；确定的", context: "Fixed in the minds = Firmly believed", clue: "Synonym: Established, Rooted" },
            { key: "property", diff: 3, word: "Property", ipa: "/ˈprɒp.ə.ti/", def: "财产；所有物", context: "Rightful property = object to be owned", clue: "Something that belongs to someone" }
        ],
        insight: {
            tag: "Social Critique",
            text: "Notice the word 'Property'. Austen is criticizing how men were seen as objects to be 'acquired' by families for survival."
        }
    },
    "p3": {
        knowledge: [
            { key: "netherfield", type: "culture", diff: 3, word: "Netherfield Park", ipa: "Place", def: "内瑟菲尔德庄园", context: "Fictional estate name", clue: "Name of the large house nearby" }
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
