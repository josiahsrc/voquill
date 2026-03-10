import UIKit

class EnKeyboardView: UIView {

    override init(frame: CGRect) {
        super.init(frame: frame)
        buildKeys()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        buildKeys()
    }

    private func buildKeys() {
        let keyboardStack = UIStackView()
        keyboardStack.axis = .vertical
        keyboardStack.spacing = 6
        keyboardStack.distribution = .fillEqually
        keyboardStack.translatesAutoresizingMaskIntoConstraints = false
        addSubview(keyboardStack)

        let letterRows: [[String]] = [
            ["Q","W","E","R","T","Y","U","I","O","P"],
            ["A","S","D","F","G","H","J","K","L"],
            ["Z","X","C","V","B","N","M"]
        ]

        for row in letterRows {
            let rowStack = UIStackView()
            rowStack.axis = .horizontal
            rowStack.spacing = 4
            rowStack.distribution = .fillEqually

            for key in row {
                rowStack.addArrangedSubview(createKey(key))
            }

            keyboardStack.addArrangedSubview(rowStack)
        }

        let bottomRow = UIStackView()
        bottomRow.axis = .horizontal
        bottomRow.spacing = 4
        bottomRow.distribution = .fill

        let numKey = createKey("123", bgColor: .systemGray3)
        numKey.widthAnchor.constraint(equalToConstant: 44).isActive = true
        bottomRow.addArrangedSubview(numKey)

        let spaceKey = createKey("space")
        spaceKey.setContentHuggingPriority(.defaultLow, for: .horizontal)
        bottomRow.addArrangedSubview(spaceKey)

        let returnKey = createKey("return", bgColor: .systemGray3)
        returnKey.widthAnchor.constraint(equalToConstant: 80).isActive = true
        bottomRow.addArrangedSubview(returnKey)

        keyboardStack.addArrangedSubview(bottomRow)

        NSLayoutConstraint.activate([
            keyboardStack.topAnchor.constraint(equalTo: topAnchor, constant: 6),
            keyboardStack.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 3),
            keyboardStack.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -3),
            keyboardStack.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -6),
        ])
    }

    private func createKey(_ title: String, bgColor: UIColor = .white) -> UIView {
        let key = UIView()
        key.backgroundColor = bgColor
        key.layer.cornerRadius = 5
        key.layer.shadowColor = UIColor.black.cgColor
        key.layer.shadowOffset = CGSize(width: 0, height: 1)
        key.layer.shadowOpacity = 0.15
        key.layer.shadowRadius = 0.5
        key.clipsToBounds = false

        let label = UILabel()
        label.text = title
        label.font = .systemFont(ofSize: title.count > 1 ? 14 : 16)
        label.textColor = .label
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        key.addSubview(label)

        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: key.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: key.centerYAnchor),
        ])

        return key
    }
}
