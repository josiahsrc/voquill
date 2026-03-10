import UIKit

class EnKeyboardView: UIView {

    enum Mode {
        case letters
        case numbers
        case extraSymbols
    }

    weak var textDocumentProxy: UITextDocumentProxy?

    private var mode: Mode = .letters {
        didSet { rebuild() }
    }

    private let keySpacing: CGFloat = 6
    private let rowSpacing: CGFloat = 12
    private let keyCornerRadius: CGFloat = 5
    private let keyHeight: CGFloat = 42

    private let letterKeyColor = UIColor(white: 0.42, alpha: 1)
    private let specialKeyColor = UIColor(white: 0.30, alpha: 1)
    private let shiftActiveColor = UIColor(white: 0.85, alpha: 1)
    private let keyTextColor = UIColor.white
    private let shiftActiveTextColor = UIColor.black

    // MARK: - Touch State

    private var activeKeyView: UIView?
    private var activeCharacter: String?
    private var holdTimer: Timer?
    private var magnifyView: KeyMagnifyView?
    private var variantStrip: KeyVariantStrip?
    private var didSelectVariant = false

    // MARK: - Variants

    private static let variants: [String: [String]] = [
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

    // MARK: - Init

    override init(frame: CGRect) {
        super.init(frame: frame)
        rebuild()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        rebuild()
    }

    private func rebuild() {
        dismissPopups()
        subviews.forEach { $0.removeFromSuperview() }
        backgroundColor = UIColor(white: 0.13, alpha: 1)
        clipsToBounds = false

        let keyboardStack = UIStackView()
        keyboardStack.axis = .vertical
        keyboardStack.spacing = rowSpacing
        keyboardStack.distribution = .fill
        keyboardStack.translatesAutoresizingMaskIntoConstraints = false
        addSubview(keyboardStack)

        switch mode {
        case .letters:
            buildLetterRows(into: keyboardStack)
        case .numbers:
            buildNumberRows(into: keyboardStack)
        case .extraSymbols:
            buildExtraSymbolRows(into: keyboardStack)
        }

        NSLayoutConstraint.activate([
            keyboardStack.topAnchor.constraint(equalTo: topAnchor, constant: 8),
            keyboardStack.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 3),
            keyboardStack.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -3),
            keyboardStack.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -4),
        ])
    }

    // MARK: - Letter Layout

    private func buildLetterRows(into stack: UIStackView) {
        stack.addArrangedSubview(makeCharRow(["Q","W","E","R","T","Y","U","I","O","P"]))

        let row2Container = UIView()
        let row2 = makeCharRow(["A","S","D","F","G","H","J","K","L"])
        row2.translatesAutoresizingMaskIntoConstraints = false
        row2Container.addSubview(row2)
        NSLayoutConstraint.activate([
            row2.topAnchor.constraint(equalTo: row2Container.topAnchor),
            row2.bottomAnchor.constraint(equalTo: row2Container.bottomAnchor),
            row2.centerXAnchor.constraint(equalTo: row2Container.centerXAnchor),
            row2.widthAnchor.constraint(equalTo: row2Container.widthAnchor, multiplier: 9.0/10.0),
        ])
        stack.addArrangedSubview(row2Container)

        stack.addArrangedSubview(makeSideKeyRow(
            leftKey: makeSpecialKey(systemIcon: "shift.fill", bgColor: shiftActiveColor, textColor: shiftActiveTextColor),
            centerKeys: ["Z","X","C","V","B","N","M"],
            rightKey: makeSpecialKey(systemIcon: "delete.left", bgColor: specialKeyColor, textColor: keyTextColor)
        ))

        stack.addArrangedSubview(makeBottomRow(toggleLabel: "123", toggleAction: #selector(switchToNumbers)))
    }

    // MARK: - Numbers/Symbols Layout

    private func buildNumberRows(into stack: UIStackView) {
        stack.addArrangedSubview(makeCharRow(["1","2","3","4","5","6","7","8","9","0"]))
        stack.addArrangedSubview(makeCharRow(["-","/",":",";","(",")","$","&","@","\""]))

        stack.addArrangedSubview(makeSideKeyRow(
            leftKey: makeSpecialKey(title: "#+=", bgColor: specialKeyColor, textColor: keyTextColor, fontSize: 15, action: #selector(switchToExtraSymbols)),
            centerKeys: [".",",","?","!","'"],
            rightKey: makeSpecialKey(systemIcon: "delete.left", bgColor: specialKeyColor, textColor: keyTextColor)
        ))

        stack.addArrangedSubview(makeBottomRow(toggleLabel: "ABC", toggleAction: #selector(switchToLetters)))
    }

    // MARK: - Extra Symbols Layout

    private func buildExtraSymbolRows(into stack: UIStackView) {
        stack.addArrangedSubview(makeCharRow(["[","]","{","}","#","%","^","*","+","="]))
        stack.addArrangedSubview(makeCharRow(["_","\\","|","~","<",">","€","£","¥","•"]))

        stack.addArrangedSubview(makeSideKeyRow(
            leftKey: makeSpecialKey(title: "123", bgColor: specialKeyColor, textColor: keyTextColor, fontSize: 15, action: #selector(switchToNumbers)),
            centerKeys: [".",",","?","!","'"],
            rightKey: makeSpecialKey(systemIcon: "delete.left", bgColor: specialKeyColor, textColor: keyTextColor)
        ))

        stack.addArrangedSubview(makeBottomRow(toggleLabel: "ABC", toggleAction: #selector(switchToLetters)))
    }

    // MARK: - Row Builders

    private func makeCharRow(_ keys: [String]) -> UIStackView {
        let row = UIStackView()
        row.axis = .horizontal
        row.spacing = keySpacing
        row.distribution = .fillEqually

        for key in keys {
            row.addArrangedSubview(makeCharKey(key))
        }

        return row
    }

    private func makeSideKeyRow(leftKey: UIView, centerKeys: [String], rightKey: UIView) -> UIView {
        let container = UIView()
        container.heightAnchor.constraint(equalToConstant: keyHeight).isActive = true

        leftKey.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(leftKey)

        let centerStack = makeCharRow(centerKeys)
        centerStack.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(centerStack)

        rightKey.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(rightKey)

        let sideKeyWidth: CGFloat = 44

        NSLayoutConstraint.activate([
            leftKey.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            leftKey.topAnchor.constraint(equalTo: container.topAnchor),
            leftKey.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            leftKey.widthAnchor.constraint(equalToConstant: sideKeyWidth),

            centerStack.leadingAnchor.constraint(equalTo: leftKey.trailingAnchor, constant: keySpacing * 2),
            centerStack.topAnchor.constraint(equalTo: container.topAnchor),
            centerStack.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            centerStack.trailingAnchor.constraint(equalTo: rightKey.leadingAnchor, constant: -keySpacing * 2),

            rightKey.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            rightKey.topAnchor.constraint(equalTo: container.topAnchor),
            rightKey.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            rightKey.widthAnchor.constraint(equalToConstant: sideKeyWidth),
        ])

        return container
    }

    private func makeBottomRow(toggleLabel: String, toggleAction: Selector) -> UIView {
        let container = UIView()
        container.heightAnchor.constraint(equalToConstant: keyHeight).isActive = true

        let toggleKey = makeSpecialKey(title: toggleLabel, bgColor: specialKeyColor, textColor: keyTextColor, fontSize: 15, action: toggleAction)
        toggleKey.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(toggleKey)

        let spaceKey = makeSpecialKey(title: "space", bgColor: letterKeyColor, textColor: keyTextColor, fontSize: 16)
        spaceKey.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(spaceKey)

        let returnKey = makeSpecialKey(title: "return", bgColor: specialKeyColor, textColor: keyTextColor, fontSize: 15)
        returnKey.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(returnKey)

        let bottomSideKeyWidth: CGFloat = 88

        NSLayoutConstraint.activate([
            toggleKey.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            toggleKey.topAnchor.constraint(equalTo: container.topAnchor),
            toggleKey.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            toggleKey.widthAnchor.constraint(equalToConstant: bottomSideKeyWidth),

            spaceKey.leadingAnchor.constraint(equalTo: toggleKey.trailingAnchor, constant: keySpacing),
            spaceKey.topAnchor.constraint(equalTo: container.topAnchor),
            spaceKey.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            spaceKey.trailingAnchor.constraint(equalTo: returnKey.leadingAnchor, constant: -keySpacing),

            returnKey.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            returnKey.topAnchor.constraint(equalTo: container.topAnchor),
            returnKey.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            returnKey.widthAnchor.constraint(equalToConstant: bottomSideKeyWidth),
        ])

        return container
    }

    // MARK: - Character Key (touch-handled by EnKeyboardView)

    private func makeCharKey(_ character: String) -> UIView {
        let key = UIView()
        key.backgroundColor = letterKeyColor
        key.layer.cornerRadius = keyCornerRadius
        key.layer.shadowColor = UIColor.black.cgColor
        key.layer.shadowOffset = CGSize(width: 0, height: 1)
        key.layer.shadowOpacity = 0.3
        key.layer.shadowRadius = 0
        key.clipsToBounds = false
        key.heightAnchor.constraint(equalToConstant: keyHeight).isActive = true
        key.isUserInteractionEnabled = false
        key.accessibilityLabel = character

        let label = UILabel()
        label.text = character
        label.font = .systemFont(ofSize: 22, weight: .regular)
        label.textColor = keyTextColor
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        key.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: key.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: key.centerYAnchor),
        ])

        return key
    }

    // MARK: - Special Key (self-contained tap via KeyButton)

    private func makeSpecialKey(
        title: String? = nil,
        systemIcon: String? = nil,
        bgColor: UIColor,
        textColor: UIColor,
        fontSize: CGFloat = 22,
        action: Selector? = nil
    ) -> UIView {
        let key = UIView()
        key.backgroundColor = bgColor
        key.layer.cornerRadius = keyCornerRadius
        key.layer.shadowColor = UIColor.black.cgColor
        key.layer.shadowOffset = CGSize(width: 0, height: 1)
        key.layer.shadowOpacity = 0.3
        key.layer.shadowRadius = 0
        key.clipsToBounds = false
        key.heightAnchor.constraint(equalToConstant: keyHeight).isActive = true

        if let systemIcon = systemIcon {
            let config = UIImage.SymbolConfiguration(pointSize: 18, weight: .medium)
            let imageView = UIImageView(image: UIImage(systemName: systemIcon, withConfiguration: config))
            imageView.tintColor = textColor
            imageView.contentMode = .scaleAspectFit
            imageView.translatesAutoresizingMaskIntoConstraints = false
            key.addSubview(imageView)
            NSLayoutConstraint.activate([
                imageView.centerXAnchor.constraint(equalTo: key.centerXAnchor),
                imageView.centerYAnchor.constraint(equalTo: key.centerYAnchor),
            ])
        } else if let title = title {
            let label = UILabel()
            label.text = title
            label.font = .systemFont(ofSize: fontSize, weight: .regular)
            label.textColor = textColor
            label.textAlignment = .center
            label.translatesAutoresizingMaskIntoConstraints = false
            key.addSubview(label)
            NSLayoutConstraint.activate([
                label.centerXAnchor.constraint(equalTo: key.centerXAnchor),
                label.centerYAnchor.constraint(equalTo: key.centerYAnchor),
            ])
        }

        let button = KeyButton(target: self, action: action ?? #selector(noOp))
        button.translatesAutoresizingMaskIntoConstraints = false
        key.addSubview(button)
        NSLayoutConstraint.activate([
            button.topAnchor.constraint(equalTo: key.topAnchor),
            button.leadingAnchor.constraint(equalTo: key.leadingAnchor),
            button.trailingAnchor.constraint(equalTo: key.trailingAnchor),
            button.bottomAnchor.constraint(equalTo: key.bottomAnchor),
        ])

        return key
    }

    @objc private func noOp() {}

    // MARK: - Touch Handling (character keys)

    private func charKeyView(at point: CGPoint) -> UIView? {
        for subview in allDescendants(of: self) {
            guard subview.accessibilityLabel != nil,
                  subview.accessibilityLabel!.count <= 2,
                  !subview.isHidden else { continue }
            let converted = subview.convert(point, from: self)
            if subview.bounds.contains(converted) {
                return subview
            }
        }
        return nil
    }

    private func allDescendants(of view: UIView) -> [UIView] {
        var result: [UIView] = []
        for child in view.subviews {
            result.append(child)
            result.append(contentsOf: allDescendants(of: child))
        }
        return result
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first else {
            super.touchesBegan(touches, with: event)
            return
        }

        let point = touch.location(in: self)
        guard let keyView = charKeyView(at: point),
              let character = keyView.accessibilityLabel else {
            super.touchesBegan(touches, with: event)
            return
        }

        activeKeyView = keyView
        activeCharacter = character
        didSelectVariant = false

        showMagnify(for: keyView, character: character)
        animateKeyPress(keyView, pressed: true)

        let hasVariants = Self.variants[character.uppercased()] != nil
        if hasVariants {
            holdTimer = Timer.scheduledTimer(withTimeInterval: 0.3, repeats: false) { [weak self] _ in
                self?.showVariants()
            }
        }
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let touch = touches.first, let strip = variantStrip else {
            super.touchesMoved(touches, with: event)
            return
        }
        let point = touch.location(in: strip)
        strip.updateSelection(at: point)
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard activeKeyView != nil else {
            super.touchesEnded(touches, with: event)
            return
        }
        commitAndReset()
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard activeKeyView != nil else {
            super.touchesCancelled(touches, with: event)
            return
        }
        resetTouchState()
    }

    private func commitAndReset() {
        if let strip = variantStrip, let selected = strip.selectedCharacter {
            textDocumentProxy?.insertText(selected)
        } else if variantStrip == nil, let char = activeCharacter {
            textDocumentProxy?.insertText(char)
        }
        resetTouchState()
    }

    private func resetTouchState() {
        holdTimer?.invalidate()
        holdTimer = nil
        if let keyView = activeKeyView {
            animateKeyPress(keyView, pressed: false)
        }
        dismissPopups()
        activeKeyView = nil
        activeCharacter = nil
        didSelectVariant = false
    }

    // MARK: - Magnify Popup

    private var popupContainer: UIView {
        window ?? self
    }

    private func showMagnify(for keyView: UIView, character: String) {
        let container = popupContainer
        let keyFrame = keyView.convert(keyView.bounds, to: container)
        let popup = KeyMagnifyView(character: character, keyFrame: keyFrame, cornerRadius: keyCornerRadius)
        container.addSubview(popup)
        magnifyView = popup
    }

    // MARK: - Variant Strip

    private func showVariants() {
        guard let keyView = activeKeyView,
              let character = activeCharacter,
              let chars = Self.variants[character.uppercased()] else { return }

        magnifyView?.removeFromSuperview()
        magnifyView = nil

        let container = popupContainer
        let keyFrame = keyView.convert(keyView.bounds, to: container)
        let containerBounds = container.bounds
        let strip = KeyVariantStrip(
            baseCharacter: character,
            variants: chars,
            anchorFrame: keyFrame,
            keyboardBounds: containerBounds,
            cornerRadius: keyCornerRadius
        )
        container.addSubview(strip)
        variantStrip = strip
    }

    private func dismissPopups() {
        magnifyView?.removeFromSuperview()
        magnifyView = nil
        variantStrip?.removeFromSuperview()
        variantStrip = nil
    }

    // MARK: - Key Press Animation

    private func animateKeyPress(_ keyView: UIView, pressed: Bool) {
        UIView.animate(
            withDuration: pressed ? 0.05 : 0.12,
            delay: 0,
            options: [.allowUserInteraction, .beginFromCurrentState],
            animations: {
                keyView.transform = pressed ? CGAffineTransform(scaleX: 0.95, y: 0.95) : .identity
                keyView.alpha = pressed ? 0.7 : 1.0
            }
        )
    }

    // MARK: - Mode Actions

    @objc private func switchToLetters() { mode = .letters }
    @objc private func switchToNumbers() { mode = .numbers }
    @objc private func switchToExtraSymbols() { mode = .extraSymbols }
}

// MARK: - Magnify Popup View

private class KeyMagnifyView: UIView {

    private let fillColor = UIColor(white: 0.55, alpha: 1)

    init(character: String, keyFrame: CGRect, cornerRadius: CGFloat) {
        let bubbleWidth = keyFrame.width + 16
        let bubbleHeight: CGFloat = 56
        let stemHeight = keyFrame.height
        let totalHeight = bubbleHeight + stemHeight

        let x = keyFrame.midX - bubbleWidth / 2
        let y = keyFrame.minY - bubbleHeight

        super.init(frame: CGRect(x: x, y: y, width: bubbleWidth, height: totalHeight))

        backgroundColor = .clear
        isUserInteractionEnabled = false
        clipsToBounds = false

        let shape = KeyMagnifyShapeView(frame: bounds)
        shape.fillColor = fillColor
        shape.bubbleHeight = bubbleHeight
        shape.bubbleCornerRadius = cornerRadius + 2
        shape.stemCornerRadius = cornerRadius
        shape.keyWidth = keyFrame.width
        addSubview(shape)

        shape.layer.shadowColor = UIColor.black.cgColor
        shape.layer.shadowOffset = CGSize(width: 0, height: 2)
        shape.layer.shadowOpacity = 0.4
        shape.layer.shadowRadius = 4

        let label = UILabel()
        label.text = character
        label.font = .systemFont(ofSize: 32, weight: .regular)
        label.textColor = .white
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: centerXAnchor),
            label.centerYAnchor.constraint(equalTo: topAnchor, constant: bubbleHeight / 2),
        ])
    }

    required init?(coder: NSCoder) { fatalError() }
}

private class KeyMagnifyShapeView: UIView {
    var fillColor: UIColor = .gray
    var bubbleHeight: CGFloat = 56
    var bubbleCornerRadius: CGFloat = 7
    var stemCornerRadius: CGFloat = 5
    var keyWidth: CGFloat = 30

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        isOpaque = false
    }

    required init?(coder: NSCoder) { fatalError() }

    override func draw(_ rect: CGRect) {
        let w = rect.width
        let h = rect.height
        let stemX = (w - keyWidth) / 2
        let br = bubbleCornerRadius
        let sr = stemCornerRadius

        let path = UIBezierPath()

        // Top-left corner of bubble
        path.move(to: CGPoint(x: br, y: 0))

        // Top edge
        path.addLine(to: CGPoint(x: w - br, y: 0))
        // Top-right corner
        path.addQuadCurve(to: CGPoint(x: w, y: br), controlPoint: CGPoint(x: w, y: 0))

        // Right edge of bubble down to where it narrows
        path.addLine(to: CGPoint(x: w, y: bubbleHeight - br))
        // Bottom-right corner of bubble curving inward
        path.addQuadCurve(to: CGPoint(x: w - br, y: bubbleHeight), controlPoint: CGPoint(x: w, y: bubbleHeight))

        // Shelf going right-to-left toward stem right edge
        path.addLine(to: CGPoint(x: stemX + keyWidth + sr, y: bubbleHeight))
        // Concave curve transitioning from bubble shelf to stem right edge
        path.addQuadCurve(
            to: CGPoint(x: stemX + keyWidth, y: bubbleHeight + sr),
            controlPoint: CGPoint(x: stemX + keyWidth, y: bubbleHeight)
        )

        // Right edge of stem going down
        path.addLine(to: CGPoint(x: stemX + keyWidth, y: h - sr))
        // Bottom-right corner of stem
        path.addQuadCurve(
            to: CGPoint(x: stemX + keyWidth - sr, y: h),
            controlPoint: CGPoint(x: stemX + keyWidth, y: h)
        )

        // Bottom edge of stem
        path.addLine(to: CGPoint(x: stemX + sr, y: h))
        // Bottom-left corner of stem
        path.addQuadCurve(
            to: CGPoint(x: stemX, y: h - sr),
            controlPoint: CGPoint(x: stemX, y: h)
        )

        // Left edge of stem going up
        path.addLine(to: CGPoint(x: stemX, y: bubbleHeight + sr))
        // Concave curve transitioning from stem left edge to bubble shelf
        path.addQuadCurve(
            to: CGPoint(x: stemX - sr, y: bubbleHeight),
            controlPoint: CGPoint(x: stemX, y: bubbleHeight)
        )

        // Shelf going left toward bubble left edge
        path.addLine(to: CGPoint(x: br, y: bubbleHeight))
        // Bottom-left corner of bubble curving inward
        path.addQuadCurve(to: CGPoint(x: 0, y: bubbleHeight - br), controlPoint: CGPoint(x: 0, y: bubbleHeight))

        // Left edge of bubble going up
        path.addLine(to: CGPoint(x: 0, y: br))
        // Top-left corner
        path.addQuadCurve(to: CGPoint(x: br, y: 0), controlPoint: CGPoint(x: 0, y: 0))

        path.close()
        fillColor.setFill()
        path.fill()
    }
}

// MARK: - Variant Strip

private class KeyVariantStrip: UIView {

    private let cellWidth: CGFloat = 36
    private let cellHeight: CGFloat = 46
    private let cellSpacing: CGFloat = 0
    private var characters: [String] = []
    private var cellViews: [UIView] = []
    private var selectedIndex: Int?

    private let highlightColor = UIColor.white
    private let normalTextColor = UIColor.white
    private let highlightTextColor = UIColor.black
    private let stripColor = UIColor(white: 0.45, alpha: 1)

    var selectedCharacter: String? {
        guard let idx = selectedIndex, idx >= 0, idx < characters.count else { return nil }
        return characters[idx]
    }

    init(baseCharacter: String, variants: [String], anchorFrame: CGRect, keyboardBounds: CGRect, cornerRadius: CGFloat) {
        characters = [baseCharacter] + variants
        let totalWidth = CGFloat(characters.count) * cellWidth
        let stripX = min(
            max(0, anchorFrame.midX - totalWidth / 2),
            keyboardBounds.width - totalWidth
        )
        let stripY = anchorFrame.minY - cellHeight - 8

        super.init(frame: CGRect(x: stripX, y: stripY, width: totalWidth, height: cellHeight))

        backgroundColor = stripColor
        layer.cornerRadius = cornerRadius + 2
        clipsToBounds = true
        isUserInteractionEnabled = false

        layer.shadowColor = UIColor.black.cgColor
        layer.shadowOffset = CGSize(width: 0, height: 2)
        layer.shadowOpacity = 0.4
        layer.shadowRadius = 4

        for (i, char) in characters.enumerated() {
            let cell = UIView(frame: CGRect(x: CGFloat(i) * cellWidth, y: 0, width: cellWidth, height: cellHeight))
            cell.backgroundColor = .clear
            cell.layer.cornerRadius = cornerRadius

            let label = UILabel()
            label.text = char
            label.font = .systemFont(ofSize: 22, weight: .regular)
            label.textColor = normalTextColor
            label.textAlignment = .center
            label.tag = 100
            label.translatesAutoresizingMaskIntoConstraints = false
            cell.addSubview(label)
            NSLayoutConstraint.activate([
                label.centerXAnchor.constraint(equalTo: cell.centerXAnchor),
                label.centerYAnchor.constraint(equalTo: cell.centerYAnchor),
            ])

            addSubview(cell)
            cellViews.append(cell)
        }

        setSelected(index: 0)
    }

    required init?(coder: NSCoder) { fatalError() }

    func updateSelection(at point: CGPoint) {
        let localX = point.x
        let index = Int(localX / cellWidth)
        let clamped = max(0, min(index, characters.count - 1))
        setSelected(index: clamped)
    }

    private func setSelected(index: Int) {
        guard index != selectedIndex else { return }
        selectedIndex = index

        for (i, cell) in cellViews.enumerated() {
            let isSelected = i == index
            cell.backgroundColor = isSelected ? highlightColor : .clear
            if let label = cell.viewWithTag(100) as? UILabel {
                label.textColor = isSelected ? highlightTextColor : normalTextColor
            }
        }
    }
}

// MARK: - Special Key Button

private class KeyButton: UIControl {

    private weak var pressTarget: AnyObject?
    private var pressAction: Selector?

    convenience init(target: AnyObject, action: Selector) {
        self.init(frame: .zero)
        pressTarget = target
        pressAction = action
    }

    override var isHighlighted: Bool {
        didSet {
            guard let parent = superview else { return }
            UIView.animate(
                withDuration: isHighlighted ? 0.05 : 0.12,
                delay: 0,
                options: [.allowUserInteraction, .beginFromCurrentState],
                animations: {
                    parent.transform = self.isHighlighted
                        ? CGAffineTransform(scaleX: 0.95, y: 0.95)
                        : .identity
                    parent.alpha = self.isHighlighted ? 0.7 : 1.0
                }
            )
        }
    }

    override func endTracking(_ touch: UITouch?, with event: UIEvent?) {
        super.endTracking(touch, with: event)
        if isTouchInside, let target = pressTarget, let action = pressAction {
            _ = target.perform(action, with: self)
        }
    }
}
