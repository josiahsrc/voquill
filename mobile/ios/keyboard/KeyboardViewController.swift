import UIKit

// MARK: - Audio Waveform

class AudioWaveformView: UIView {
    private var displayLink: CADisplayLink?
    private var phase: CGFloat = 0
    private var currentLevel: CGFloat = 0.0
    private var targetLevel: CGFloat = 0.0

    private let basePhaseStep: CGFloat = 0.18
    private let attackSmoothing: CGFloat = 0.5
    private let decaySmoothing: CGFloat = 0.35

    private struct WaveConfig {
        let frequency: CGFloat
        let multiplier: CGFloat
        let phaseOffset: CGFloat
        let opacity: CGFloat
    }

    private let waveConfigs: [WaveConfig] = [
        WaveConfig(frequency: 0.8, multiplier: 1.0, phaseOffset: 0, opacity: 1.0),
        WaveConfig(frequency: 1.0, multiplier: 0.8, phaseOffset: 0.85, opacity: 0.65),
        WaveConfig(frequency: 1.25, multiplier: 0.6, phaseOffset: 1.7, opacity: 0.35)
    ]

    var waveColor: UIColor = .label {
        didSet { setNeedsDisplay() }
    }

    var isActive: Bool = false {
        didSet { if !isActive { targetLevel = 0 } }
    }

    private let fadeLayer = CAGradientLayer()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupFade()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupFade()
    }

    private func setupFade() {
        backgroundColor = .clear
        isOpaque = false
        fadeLayer.colors = [
            UIColor.clear.cgColor,
            UIColor.white.cgColor,
            UIColor.white.cgColor,
            UIColor.clear.cgColor
        ]
        fadeLayer.locations = [0, 0.12, 0.88, 1.0]
        fadeLayer.startPoint = CGPoint(x: 0, y: 0.5)
        fadeLayer.endPoint = CGPoint(x: 1, y: 0.5)
        layer.mask = fadeLayer
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        fadeLayer.frame = bounds
        CATransaction.commit()
    }

    func startAnimating() {
        stopAnimating()
        displayLink = CADisplayLink(target: self, selector: #selector(tick))
        displayLink?.preferredFramesPerSecond = 60
        displayLink?.add(to: .main, forMode: .common)
    }

    func stopAnimating() {
        displayLink?.invalidate()
        displayLink = nil
    }

    func updateLevel(_ level: CGFloat) {
        targetLevel = level
    }

    @objc private func tick() {
        let smoothing = targetLevel > currentLevel ? attackSmoothing : decaySmoothing
        currentLevel += (targetLevel - currentLevel) * smoothing

        if isActive {
            phase += basePhaseStep + (currentLevel * 0.06)
        }
        if phase > .pi * 2 { phase -= .pi * 2 }

        setNeedsDisplay()
    }

    override func draw(_ rect: CGRect) {
        guard let ctx = UIGraphicsGetCurrentContext() else { return }
        let w = rect.width, h = rect.height, mid = h / 2

        if !isActive && currentLevel < 0.01 {
            let path = UIBezierPath()
            path.move(to: CGPoint(x: 0, y: mid))
            path.addLine(to: CGPoint(x: w, y: mid))
            ctx.saveGState()
            waveColor.setStroke()
            path.lineWidth = 2.5
            path.stroke()
            ctx.restoreGState()
            return
        }

        for cfg in waveConfigs {
            let amp = h * 0.45 * currentLevel * cfg.multiplier
            let path = UIBezierPath()
            let segments = 60

            for i in 0...segments {
                let x = CGFloat(i) / CGFloat(segments) * w
                let y = mid + amp * sin(cfg.frequency * (x / w) * .pi * 2 + phase + cfg.phaseOffset)
                if i == 0 { path.move(to: CGPoint(x: x, y: y)) }
                else { path.addLine(to: CGPoint(x: x, y: y)) }
            }

            ctx.saveGState()
            waveColor.withAlphaComponent(cfg.opacity).setStroke()
            path.lineWidth = 2.5
            path.lineCapStyle = .round
            path.lineJoinStyle = .round
            path.stroke()
            ctx.restoreGState()
        }
    }
}

// MARK: - Indeterminate Progress Bar

class IndeterminateProgressView: UIView {
    private var displayLink: CADisplayLink?
    private var time: CGFloat = 0

    var barColor: UIColor = .label

    private let fadeLayer = CAGradientLayer()
    private let cycleDuration: CGFloat = 1.8

    override init(frame: CGRect) {
        super.init(frame: frame)
        setup()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setup()
    }

    private func setup() {
        backgroundColor = .clear
        isOpaque = false
        fadeLayer.colors = [
            UIColor.clear.cgColor,
            UIColor.white.cgColor,
            UIColor.white.cgColor,
            UIColor.clear.cgColor
        ]
        fadeLayer.locations = [0, 0.12, 0.88, 1.0]
        fadeLayer.startPoint = CGPoint(x: 0, y: 0.5)
        fadeLayer.endPoint = CGPoint(x: 1, y: 0.5)
        layer.mask = fadeLayer
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        fadeLayer.frame = bounds
        CATransaction.commit()
    }

    func startAnimating() {
        stopAnimating()
        time = 0
        displayLink = CADisplayLink(target: self, selector: #selector(tick))
        displayLink?.preferredFramesPerSecond = 60
        displayLink?.add(to: .main, forMode: .common)
    }

    func stopAnimating() {
        displayLink?.invalidate()
        displayLink = nil
    }

    private func easeInOut(_ t: CGFloat) -> CGFloat {
        if t < 0.5 {
            return 2 * t * t
        } else {
            return -1 + (4 - 2 * t) * t
        }
    }

    @objc private func tick() {
        time += 1.0 / 60.0
        if time > cycleDuration { time -= cycleDuration }
        setNeedsDisplay()
    }

    override func draw(_ rect: CGRect) {
        guard let ctx = UIGraphicsGetCurrentContext() else { return }
        let w = rect.width, h = rect.height, mid = h / 2

        let trackPath = UIBezierPath()
        trackPath.move(to: CGPoint(x: 0, y: mid))
        trackPath.addLine(to: CGPoint(x: w, y: mid))
        ctx.saveGState()
        barColor.withAlphaComponent(0.15).setStroke()
        trackPath.lineWidth = 2.5
        trackPath.lineCapStyle = .round
        trackPath.stroke()
        ctx.restoreGState()

        let t = time / cycleDuration

        let headT = easeInOut(min(t * 1.2, 1.0))
        let head = -0.1 + headT * 1.2

        let tailRaw = max((t - 0.2) / 0.8, 0)
        let tailT = easeInOut(min(tailRaw, 1.0))
        let tail = -0.1 + tailT * 1.2

        let startX = tail * w
        let endX = head * w
        let clampedStart = max(0, min(w, startX))
        let clampedEnd = max(0, min(w, endX))

        if clampedEnd > clampedStart + 1 {
            let barPath = UIBezierPath()
            barPath.move(to: CGPoint(x: clampedStart, y: mid))
            barPath.addLine(to: CGPoint(x: clampedEnd, y: mid))
            ctx.saveGState()
            barColor.setStroke()
            barPath.lineWidth = 2.5
            barPath.lineCapStyle = .round
            barPath.stroke()
            ctx.restoreGState()
        }
    }
}

// MARK: - Keyboard Controller

class KeyboardViewController: UIInputViewController {

    enum Phase {
        case idle, recording, loading
    }

    private var currentPhase: Phase = .idle

    private var pillButton: UIView!
    private var pillLabel: UILabel!
    private var waveformView: AudioWaveformView!
    private var progressView: IndeterminateProgressView!
    private var nextKeyboardButton: UIButton?
    private var languageChip: UIButton!

    private var toneContainer: UIScrollView!
    private var selectedToneId: String?
    private var activeToneIds: [String] = []
    private var toneById: [String: SharedTone] = [:]

    private var termIds: [String] = []
    private var termById: [String: SharedTerm] = [:]

    private var dictationLanguages: [String] = ["en"]

    private var simulatedWaveformTimer: Timer?
    private var appCounterPoller: Timer?
    private var lastAppCounter: Int = -1

    override func viewDidLoad() {
        super.viewDidLoad()
        buildUI()
        applyPhase(.idle, animated: false)
        startKeyboardCounterPoller()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        resumeDictationStateIfNeeded()
    }

    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        updateColorsForAppearance()
    }

    private func updateColorsForAppearance() {
        waveformView.waveColor = .white
        progressView.barColor = .white
    }

    private func buildUI() {
        view.backgroundColor = .clear

        let hc = view.heightAnchor.constraint(equalToConstant: 250)
        hc.priority = .defaultHigh
        hc.isActive = true

        languageChip = UIButton(type: .system)
        languageChip.translatesAutoresizingMaskIntoConstraints = false
        languageChip.setTitle("EN", for: .normal)
        languageChip.titleLabel?.font = .systemFont(ofSize: 13, weight: .semibold)
        languageChip.setTitleColor(.label, for: .normal)
        languageChip.backgroundColor = UIColor.systemGray4
        languageChip.layer.cornerRadius = 8
        languageChip.clipsToBounds = true
        languageChip.isUserInteractionEnabled = true
        languageChip.addTarget(self, action: #selector(onLanguageChipTap), for: .touchUpInside)
        view.addSubview(languageChip)

        let btnConfig = UIImage.SymbolConfiguration(pointSize: 18, weight: .medium)
        let utilStack = UIStackView()
        utilStack.translatesAutoresizingMaskIntoConstraints = false
        utilStack.axis = .horizontal
        utilStack.spacing = 8
        view.addSubview(utilStack)

        for (index, iconName) in ["at", "space", "return.left", "delete.left"].enumerated() {
            let btn = UIButton(type: .system)
            btn.setImage(UIImage(systemName: iconName, withConfiguration: btnConfig), for: .normal)
            btn.tintColor = .label
            btn.backgroundColor = UIColor.systemGray4
            btn.layer.cornerRadius = 8
            btn.clipsToBounds = true
            btn.tag = index
            btn.addTarget(self, action: #selector(onUtilButtonTap(_:)), for: .touchUpInside)
            NSLayoutConstraint.activate([
                btn.widthAnchor.constraint(equalToConstant: 40),
                btn.heightAnchor.constraint(equalToConstant: 40)
            ])
            utilStack.addArrangedSubview(btn)
        }

        pillButton = UIView()
        pillButton.translatesAutoresizingMaskIntoConstraints = false
        pillButton.backgroundColor = UIColor(red: 0.2, green: 0.5, blue: 1.0, alpha: 1.0)
        pillButton.layer.cornerRadius = 28
        pillButton.clipsToBounds = true
        pillButton.isUserInteractionEnabled = true
        view.addSubview(pillButton)

        let tap = UITapGestureRecognizer(target: self, action: #selector(onPillTap))
        pillButton.addGestureRecognizer(tap)

        waveformView = AudioWaveformView()
        waveformView.translatesAutoresizingMaskIntoConstraints = false
        waveformView.alpha = 0
        pillButton.addSubview(waveformView)

        progressView = IndeterminateProgressView()
        progressView.translatesAutoresizingMaskIntoConstraints = false
        progressView.alpha = 0
        pillButton.addSubview(progressView)

        pillLabel = UILabel()
        pillLabel.translatesAutoresizingMaskIntoConstraints = false
        pillLabel.textColor = .white
        pillLabel.font = .systemFont(ofSize: 15, weight: .semibold)
        pillLabel.textAlignment = .center
        pillButton.addSubview(pillLabel)

        NSLayoutConstraint.activate([
            waveformView.leadingAnchor.constraint(equalTo: pillButton.leadingAnchor),
            waveformView.trailingAnchor.constraint(equalTo: pillButton.trailingAnchor),
            waveformView.topAnchor.constraint(equalTo: pillButton.topAnchor),
            waveformView.bottomAnchor.constraint(equalTo: pillButton.bottomAnchor),

            progressView.leadingAnchor.constraint(equalTo: pillButton.leadingAnchor, constant: 16),
            progressView.trailingAnchor.constraint(equalTo: pillButton.trailingAnchor, constant: -16),
            progressView.centerYAnchor.constraint(equalTo: pillButton.centerYAnchor),
            progressView.heightAnchor.constraint(equalToConstant: 20),

            pillLabel.centerXAnchor.constraint(equalTo: pillButton.centerXAnchor),
            pillLabel.centerYAnchor.constraint(equalTo: pillButton.centerYAnchor),
        ])

        let nkb = UIButton(type: .system)
        nkb.setImage(UIImage(systemName: "globe", withConfiguration: UIImage.SymbolConfiguration(pointSize: 18)), for: .normal)
        nkb.tintColor = .label
        nkb.translatesAutoresizingMaskIntoConstraints = false
        nkb.addTarget(self, action: #selector(handleInputModeList(from:with:)), for: .allTouchEvents)
        view.addSubview(nkb)
        nextKeyboardButton = nkb

        toneContainer = UIScrollView()
        toneContainer.translatesAutoresizingMaskIntoConstraints = false
        toneContainer.showsHorizontalScrollIndicator = false
        view.addSubview(toneContainer)

        let topSpacer = UIView()
        topSpacer.translatesAutoresizingMaskIntoConstraints = false
        topSpacer.isHidden = true
        view.addSubview(topSpacer)

        let bottomSpacer = UIView()
        bottomSpacer.translatesAutoresizingMaskIntoConstraints = false
        bottomSpacer.isHidden = true
        view.addSubview(bottomSpacer)

        NSLayoutConstraint.activate([
            languageChip.topAnchor.constraint(equalTo: view.topAnchor, constant: 8),
            languageChip.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 12),
            languageChip.heightAnchor.constraint(equalToConstant: 40),
            languageChip.widthAnchor.constraint(greaterThanOrEqualToConstant: 40),

            utilStack.topAnchor.constraint(equalTo: view.topAnchor, constant: 8),
            utilStack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -12),

            topSpacer.topAnchor.constraint(equalTo: utilStack.bottomAnchor),
            topSpacer.bottomAnchor.constraint(equalTo: pillButton.topAnchor),
            topSpacer.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            topSpacer.widthAnchor.constraint(equalToConstant: 0),

            bottomSpacer.topAnchor.constraint(equalTo: pillButton.bottomAnchor),
            bottomSpacer.bottomAnchor.constraint(equalTo: toneContainer.topAnchor),
            bottomSpacer.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            bottomSpacer.widthAnchor.constraint(equalToConstant: 0),

            topSpacer.heightAnchor.constraint(equalTo: bottomSpacer.heightAnchor),

            pillButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            pillButton.widthAnchor.constraint(equalToConstant: 220),
            pillButton.heightAnchor.constraint(equalToConstant: 56),

            toneContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            toneContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            toneContainer.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -8),
            toneContainer.heightAnchor.constraint(equalToConstant: 32),

            nkb.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 8),
            nkb.centerYAnchor.constraint(equalTo: toneContainer.centerYAnchor),
            nkb.widthAnchor.constraint(equalToConstant: 36),
            nkb.heightAnchor.constraint(equalToConstant: 36),
        ])

        loadTones()
        loadLanguage()
        loadDictionary()

        waveformView.startAnimating()
        updateColorsForAppearance()
    }

    private func applyPhase(_ phase: Phase, animated: Bool) {
        currentPhase = phase

        let changes: () -> Void
        switch phase {
        case .idle:
            changes = {
                self.waveformView.alpha = 0
                self.waveformView.isActive = false
                self.progressView.alpha = 0
                self.pillButton.backgroundColor = UIColor(red: 0.2, green: 0.5, blue: 1.0, alpha: 1.0)
                self.pillLabel.text = "Tap to dictate"
                self.pillLabel.alpha = 1
                self.pillButton.isUserInteractionEnabled = true
            }
            progressView.stopAnimating()

        case .recording:
            changes = {
                self.waveformView.alpha = 1
                self.waveformView.isActive = true
                self.progressView.alpha = 0
                self.pillButton.backgroundColor = UIColor(red: 0.2, green: 0.5, blue: 1.0, alpha: 1.0)
                self.pillLabel.alpha = 0
                self.pillButton.isUserInteractionEnabled = true
            }

        case .loading:
            changes = {
                self.waveformView.alpha = 0
                self.waveformView.isActive = false
                self.progressView.alpha = 1
                self.pillButton.backgroundColor = UIColor.systemGray3
                self.pillLabel.text = "Processing..."
                self.pillLabel.alpha = 0
                self.pillButton.isUserInteractionEnabled = false
            }
            progressView.startAnimating()
        }

        if animated {
            UIView.animate(withDuration: 0.15, delay: 0, options: .curveEaseInOut, animations: changes)
        } else {
            changes()
        }
    }

    // MARK: - Keyboard Counter Polling

    private func startKeyboardCounterPoller() {
        appCounterPoller = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.checkKeyboardCounter()
        }
    }

    private func checkKeyboardCounter() {
        let counter = CounterRepo().getKeyboard()
        if counter != lastAppCounter {
            lastAppCounter = counter
            loadTones()
            loadLanguage()
            loadDictionary()
        }
    }

    // MARK: - Dictionary

    private func loadDictionary() {
        guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
        let loaded = SharedTerm.loadFromDefaults(defaults)
        termIds = loaded.termIds
        termById = loaded.termById
    }

    // MARK: - Language Chip

    private func loadLanguage() {
        let defaults = UserDefaults(suiteName: appGroupId)
        let language = defaults?.string(forKey: "voquill_dictation_language") ?? "en"
        dictationLanguages = defaults?.stringArray(forKey: "voquill_dictation_languages") ?? ["en"]
        let code = language.components(separatedBy: "-").first ?? language
        languageChip.setTitle(code.uppercased(), for: .normal)
    }

    @objc private func onLanguageChipTap() {
        guard !dictationLanguages.isEmpty else { return }
        let defaults = UserDefaults(suiteName: appGroupId)
        let current = defaults?.string(forKey: "voquill_dictation_language") ?? "en"
        let currentIndex = dictationLanguages.firstIndex(of: current) ?? 0
        let nextIndex = (currentIndex + 1) % dictationLanguages.count
        let next = dictationLanguages[nextIndex]

        defaults?.set(next, forKey: "voquill_dictation_language")
        let code = next.components(separatedBy: "-").first ?? next
        languageChip.setTitle(code.uppercased(), for: .normal)

        CounterRepo().incrementApp()
    }

    // MARK: - Tone Selector

    private func loadTones() {
        let defaults = UserDefaults(suiteName: appGroupId)
        let toneData = defaults.flatMap { SharedTone.loadFromDefaults($0) }
        activeToneIds = toneData?.activeToneIds ?? []
        toneById = toneData?.toneById ?? [:]
        selectedToneId = defaults?.string(forKey: "voquill_selected_tone_id") ?? activeToneIds.first
        renderToneChips()
    }

    private func renderToneChips() {
        toneContainer.subviews.forEach { $0.removeFromSuperview() }

        if activeToneIds.isEmpty || toneById.isEmpty {
            let label = UILabel()
            label.text = "No tones available"
            label.font = .systemFont(ofSize: 13, weight: .medium)
            label.textColor = .secondaryLabel
            label.sizeToFit()
            label.frame.origin = .zero
            toneContainer.addSubview(label)
            toneContainer.contentSize = label.frame.size
            return
        }

        var xOffset: CGFloat = 0
        for (index, toneId) in activeToneIds.enumerated() {
            guard let tone = toneById[toneId] else { continue }
            let chip = UIButton(type: .system)
            chip.setTitle(tone.name, for: .normal)
            chip.titleLabel?.font = .systemFont(ofSize: 13, weight: .medium)
            chip.contentEdgeInsets = UIEdgeInsets(top: 6, left: 14, bottom: 6, right: 14)
            chip.layer.cornerRadius = 16
            chip.clipsToBounds = true
            chip.tag = index
            chip.addTarget(self, action: #selector(onToneChipTap(_:)), for: .touchUpInside)
            applyChipStyle(chip, selected: toneId == selectedToneId)
            chip.sizeToFit()
            chip.frame = CGRect(x: xOffset, y: 0, width: chip.frame.width, height: 32)
            toneContainer.addSubview(chip)
            xOffset += chip.frame.width + 8
        }
        toneContainer.contentSize = CGSize(width: max(0, xOffset - 8), height: 32)
    }

    private func centerToneContent() {
        let containerWidth = toneContainer.bounds.width
        let contentWidth = toneContainer.contentSize.width
        if contentWidth < containerWidth {
            let inset = (containerWidth - contentWidth) / 2
            toneContainer.contentInset = UIEdgeInsets(top: 0, left: inset, bottom: 0, right: inset)
        } else {
            toneContainer.contentInset = .zero
        }
    }

    private func applyChipStyle(_ chip: UIButton, selected: Bool) {
        if selected {
            chip.backgroundColor = UIColor(red: 0.2, green: 0.5, blue: 1.0, alpha: 0.2)
            chip.setTitleColor(.systemBlue, for: .normal)
        } else {
            chip.backgroundColor = UIColor.systemGray4
            chip.setTitleColor(.label, for: .normal)
        }
    }

    @objc private func onToneChipTap(_ sender: UIButton) {
        let index = sender.tag
        guard index < activeToneIds.count else { return }
        selectedToneId = activeToneIds[index]

        if let defaults = UserDefaults(suiteName: appGroupId) {
            defaults.set(selectedToneId, forKey: "voquill_selected_tone_id")
        }

        for view in toneContainer.subviews {
            guard let chip = view as? UIButton else { continue }
            applyChipStyle(chip, selected: chip.tag == index)
        }
    }

    @objc private func onUtilButtonTap(_ sender: UIButton) {
        switch sender.tag {
        case 0: textDocumentProxy.insertText("@")
        case 1: textDocumentProxy.insertText(" ")
        case 2: textDocumentProxy.insertText("\n")
        case 3: textDocumentProxy.deleteBackward()
        default: break
        }
    }

    // MARK: - Dictation (IPC-based)

    @objc private func onPillTap() {
        switch currentPhase {
        case .idle:
            applyPhase(.recording, animated: true)
            startSimulatedWaveform()
            startDarwinObservers()

            let defaults = UserDefaults(suiteName: appGroupId)
            let language = defaults?.string(forKey: "voquill_dictation_language") ?? "en"
            let toneParam = selectedToneId ?? ""
            openURL("voquill://dictate?tone=\(toneParam)&lang=\(language)")

        case .recording:
            DarwinNotificationManager.shared.post(DictationConstants.stopDictation)
            stopSimulatedWaveform()
            applyPhase(.loading, animated: true)

        case .loading:
            break
        }
    }

    private func openURL(_ urlString: String) {
        guard let url = URL(string: urlString) else { return }
        var responder: UIResponder? = self
        while let r = responder {
            if let application = r as? UIApplication {
                application.open(url, options: [:], completionHandler: nil)
                return
            }
            responder = r.next
        }

        let selector = NSSelectorFromString("openURL:")
        responder = self
        while let r = responder {
            if r.responds(to: selector) {
                r.perform(selector, with: url)
                return
            }
            responder = r.next
        }
    }

    // MARK: - Simulated Waveform

    private func startSimulatedWaveform() {
        stopSimulatedWaveform()
        simulatedWaveformTimer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] _ in
            self?.waveformView?.updateLevel(CGFloat.random(in: 0.3...0.7))
        }
    }

    private func stopSimulatedWaveform() {
        simulatedWaveformTimer?.invalidate()
        simulatedWaveformTimer = nil
    }

    // MARK: - Darwin Notification Observers

    private func startDarwinObservers() {
        DarwinNotificationManager.shared.observe(DictationConstants.transcriptionReady) { [weak self] in
            self?.handleTranscriptionReady()
        }

        DarwinNotificationManager.shared.observe(DictationConstants.dictationPhaseChanged) { [weak self] in
            self?.handlePhaseChange()
        }
    }

    private func handleTranscriptionReady() {
        guard let defaults = UserDefaults(suiteName: appGroupId) else {
            cleanupDictation()
            applyPhase(.idle, animated: true)
            return
        }

        let phaseStr = defaults.string(forKey: DictationConstants.phaseKey) ?? "idle"

        if phaseStr == DictationPhase.error.rawValue {
            let error = defaults.string(forKey: DictationConstants.errorKey) ?? "Unknown error"
            textDocumentProxy.insertText("[\(error)]")
            cleanupDictation()
            applyPhase(.idle, animated: true)
            return
        }

        if let result = defaults.string(forKey: DictationConstants.resultKey), !result.isEmpty {
            let trimmed = result.trimmingCharacters(in: .whitespacesAndNewlines) + " "
            textDocumentProxy.insertText(trimmed)
        }

        cleanupDictation()
        applyPhase(.idle, animated: true)
    }

    private func handlePhaseChange() {
        guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
        let phaseStr = defaults.string(forKey: DictationConstants.phaseKey) ?? "idle"

        switch phaseStr {
        case DictationPhase.processing.rawValue:
            if currentPhase == .recording {
                stopSimulatedWaveform()
                applyPhase(.loading, animated: true)
            }
        case DictationPhase.idle.rawValue:
            if currentPhase != .idle {
                stopSimulatedWaveform()
                cleanupDictation()
                applyPhase(.idle, animated: true)
            }
        default:
            break
        }
    }

    private func cleanupDictation() {
        DarwinNotificationManager.shared.removeObserver(DictationConstants.transcriptionReady)
        DarwinNotificationManager.shared.removeObserver(DictationConstants.dictationPhaseChanged)
        stopSimulatedWaveform()

        if let defaults = UserDefaults(suiteName: appGroupId) {
            defaults.removeObject(forKey: DictationConstants.phaseKey)
            defaults.removeObject(forKey: DictationConstants.resultKey)
            defaults.removeObject(forKey: DictationConstants.errorKey)
            defaults.removeObject(forKey: DictationConstants.rawTranscriptKey)
            defaults.removeObject(forKey: DictationConstants.startedAtKey)
            defaults.removeObject(forKey: DictationConstants.toneIdKey)
        }
    }

    // MARK: - Resume Dictation State

    private func resumeDictationStateIfNeeded() {
        guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
        let phaseStr = defaults.string(forKey: DictationConstants.phaseKey) ?? "idle"
        guard phaseStr != DictationPhase.idle.rawValue else { return }

        let startedAt = defaults.double(forKey: DictationConstants.startedAtKey)
        if startedAt > 0 {
            let elapsed = Date().timeIntervalSince1970 - startedAt
            if elapsed > 300 {
                NSLog("[VoquillKB] Stale dictation detected (%.0fs), resetting", elapsed)
                cleanupDictation()
                applyPhase(.idle, animated: false)
                return
            }
        }

        startDarwinObservers()

        switch phaseStr {
        case DictationPhase.recording.rawValue:
            applyPhase(.recording, animated: false)
            startSimulatedWaveform()
        case DictationPhase.processing.rawValue:
            applyPhase(.loading, animated: false)
        case DictationPhase.ready.rawValue, DictationPhase.error.rawValue:
            handleTranscriptionReady()
        default:
            break
        }
    }

    // MARK: - System

    override func viewWillLayoutSubviews() {
        super.viewWillLayoutSubviews()
        nextKeyboardButton?.isHidden = !needsInputModeSwitchKey
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        centerToneContent()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        appCounterPoller?.invalidate()
        appCounterPoller = nil
        stopSimulatedWaveform()
        waveformView.stopAnimating()
        progressView.stopAnimating()
    }

    override func textWillChange(_ textInput: UITextInput?) {}
    override func textDidChange(_ textInput: UITextInput?) {}
}
