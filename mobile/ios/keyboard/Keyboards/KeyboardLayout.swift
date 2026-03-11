import Foundation

protocol KeyboardLayout {
    var letterRow1: [String] { get }
    var letterRow2: [String] { get }
    var letterRow3: [String] { get }
    var row2WidthMultiplier: CGFloat { get }

    var numberRow1: [String] { get }
    var numberRow2: [String] { get }
    var numberPunctuation: [String] { get }

    var symbolRow1: [String] { get }
    var symbolRow2: [String] { get }
    var symbolPunctuation: [String] { get }

    var variants: [String: [String]] { get }
}

struct EnKeyboardLayout: KeyboardLayout {
    let letterRow1 = ["Q","W","E","R","T","Y","U","I","O","P"]
    let letterRow2 = ["A","S","D","F","G","H","J","K","L"]
    let letterRow3 = ["Z","X","C","V","B","N","M"]
    let row2WidthMultiplier: CGFloat = 9.0 / 10.0

    let numberRow1 = ["1","2","3","4","5","6","7","8","9","0"]
    let numberRow2 = ["-","/",":",";","(",")","$","&","@","\""]
    let numberPunctuation = [".",",","?","!","'"]

    let symbolRow1 = ["[","]","{","}","#","%","^","*","+","="]
    let symbolRow2 = ["_","\\","|","~","<",">","€","£","¥","•"]
    let symbolPunctuation = [".",",","?","!","'"]

    let variants: [String: [String]] = [
        "A": ["À","Á","Â","Ä","Æ","Ã","Å","Ā"],
        "C": ["Ç","Ć","Č"],
        "E": ["È","É","Ê","Ë","Ē","Ė","Ę"],
        "I": ["Î","Ï","Í","Ī","Į","Ì"],
        "L": ["Ł"],
        "N": ["Ñ","Ń"],
        "O": ["Ô","Ö","Ò","Ó","Œ","Ø","Ō","Õ"],
        "S": ["SS","Ś","Š"],
        "U": ["Û","Ü","Ù","Ú","Ū"],
        "Y": ["Ÿ"],
        "Z": ["Ž","Ź","Ż"],
    ]
}

struct EsKeyboardLayout: KeyboardLayout {
    let letterRow1 = ["Q","W","E","R","T","Y","U","I","O","P"]
    let letterRow2 = ["A","S","D","F","G","H","J","K","L","Ñ"]
    let letterRow3 = ["Z","X","C","V","B","N","M"]
    let row2WidthMultiplier: CGFloat = 1.0

    let numberRow1 = ["1","2","3","4","5","6","7","8","9","0"]
    let numberRow2 = ["-","/",":",";","(",")","€","&","@","\""]
    let numberPunctuation = [".",",","¿","?","¡","!","'"]

    let symbolRow1 = ["[","]","{","}","#","%","^","*","+","="]
    let symbolRow2 = ["_","\\","|","~","<",">","$","£","¥","•"]
    let symbolPunctuation = [".",",","¿","?","¡","!","'"]

    let variants: [String: [String]] = [
        "A": ["Á","À","Â","Ä","Æ","Ã","Å","Ā"],
        "C": ["Ç","Ć","Č"],
        "E": ["É","È","Ê","Ë","Ē","Ė","Ę"],
        "I": ["Í","Î","Ï","Ī","Į","Ì"],
        "L": ["Ł"],
        "N": ["Ń"],
        "O": ["Ó","Ô","Ö","Ò","Œ","Ø","Ō","Õ"],
        "S": ["ß","Ś","Š"],
        "U": ["Ú","Û","Ü","Ù","Ū"],
        "Y": ["Ÿ"],
        "Z": ["Ž","Ź","Ż"],
    ]
}

func keyboardLayout(for language: String) -> KeyboardLayout {
    let code = language.components(separatedBy: "-").first ?? language
    switch code {
    case "es": return EsKeyboardLayout()
    default: return EnKeyboardLayout()
    }
}
