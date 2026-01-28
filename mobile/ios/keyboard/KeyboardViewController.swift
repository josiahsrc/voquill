import UIKit
import AVFoundation

class AudioWaveformView: UIView {
    private var displayLink: CADisplayLink?
    private var phase: CGFloat = 0
    private var currentLevel: CGFloat = 0.15
    private var targetLevel: CGFloat = 0.15

    private let basePhaseStep: CGFloat = 0.14
    private let attackSmoothing: CGFloat = 0.25
    private let decaySmoothing: CGFloat = 0.25

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

    var waveColor: UIColor = .label

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        isOpaque = false
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        backgroundColor = .clear
        isOpaque = false
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
        currentLevel = 0.15
        targetLevel = 0.15
    }

    func updateLevel(_ level: CGFloat) {
        targetLevel = level
    }

    @objc private func tick() {
        let smoothing = targetLevel > currentLevel ? attackSmoothing : decaySmoothing
        currentLevel += (targetLevel - currentLevel) * smoothing

        phase += basePhaseStep + (currentLevel * 0.06)
        if phase > .pi * 2 { phase -= .pi * 2 }

        setNeedsDisplay()
    }

    override func draw(_ rect: CGRect) {
        guard let ctx = UIGraphicsGetCurrentContext() else { return }
        let w = rect.width, h = rect.height, mid = h / 2

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

class KeyboardViewController: UIInputViewController {

    private let idleView = UIView()
    private let recordingView = UIView()
    private var waveformView: AudioWaveformView?
    private var nextKeyboardButton: UIButton?

    private var audioRecorder: AVAudioRecorder?
    private var levelTimer: Timer?

    override func viewDidLoad() {
        super.viewDidLoad()
        buildUI()
    }

    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        updateColorsForAppearance()
    }

    private func updateColorsForAppearance() {
        let isDark = traitCollection.userInterfaceStyle == .dark
        waveformView?.waveColor = isDark ? .white : .black
    }

    private func buildUI() {
        view.backgroundColor = .clear

        let hc = view.heightAnchor.constraint(equalToConstant: 250)
        hc.priority = .defaultHigh
        hc.isActive = true

        // === IDLE VIEW ===
        idleView.translatesAutoresizingMaskIntoConstraints = false
        idleView.backgroundColor = .clear
        view.addSubview(idleView)
        NSLayoutConstraint.activate([
            idleView.topAnchor.constraint(equalTo: view.topAnchor),
            idleView.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -44),
            idleView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            idleView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])

        let micBg = UIView()
        micBg.backgroundColor = UIColor(red: 0.2, green: 0.5, blue: 1.0, alpha: 1.0)
        micBg.layer.cornerRadius = 40
        micBg.translatesAutoresizingMaskIntoConstraints = false
        idleView.addSubview(micBg)

        let micBtn = UIButton(type: .system)
        micBtn.setImage(UIImage(systemName: "mic.fill", withConfiguration: UIImage.SymbolConfiguration(pointSize: 32)), for: .normal)
        micBtn.tintColor = .white
        micBtn.translatesAutoresizingMaskIntoConstraints = false
        micBtn.addTarget(self, action: #selector(onMicTap), for: .touchUpInside)
        micBg.addSubview(micBtn)

        let label = UILabel()
        label.text = "Tap to dictate"
        label.textColor = .secondaryLabel
        label.font = .systemFont(ofSize: 14, weight: .medium)
        label.translatesAutoresizingMaskIntoConstraints = false
        idleView.addSubview(label)

        NSLayoutConstraint.activate([
            micBg.centerXAnchor.constraint(equalTo: idleView.centerXAnchor),
            micBg.centerYAnchor.constraint(equalTo: idleView.centerYAnchor, constant: -10),
            micBg.widthAnchor.constraint(equalToConstant: 80),
            micBg.heightAnchor.constraint(equalToConstant: 80),
            micBtn.centerXAnchor.constraint(equalTo: micBg.centerXAnchor),
            micBtn.centerYAnchor.constraint(equalTo: micBg.centerYAnchor),
            label.centerXAnchor.constraint(equalTo: idleView.centerXAnchor),
            label.topAnchor.constraint(equalTo: micBg.bottomAnchor, constant: 12)
        ])

        // === RECORDING VIEW ===
        recordingView.translatesAutoresizingMaskIntoConstraints = false
        recordingView.backgroundColor = .clear
        recordingView.isHidden = true
        view.addSubview(recordingView)
        NSLayoutConstraint.activate([
            recordingView.topAnchor.constraint(equalTo: view.topAnchor),
            recordingView.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -44),
            recordingView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            recordingView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])

        let listenLbl = UILabel()
        listenLbl.text = "Listening..."
        listenLbl.textColor = .label
        listenLbl.font = .systemFont(ofSize: 16, weight: .semibold)
        listenLbl.translatesAutoresizingMaskIntoConstraints = false
        recordingView.addSubview(listenLbl)

        let wv = AudioWaveformView()
        wv.translatesAutoresizingMaskIntoConstraints = false
        recordingView.addSubview(wv)
        waveformView = wv

        let stopBg = UIView()
        stopBg.backgroundColor = .systemRed
        stopBg.layer.cornerRadius = 24
        stopBg.translatesAutoresizingMaskIntoConstraints = false
        recordingView.addSubview(stopBg)

        let stopBtn = UIButton(type: .system)
        stopBtn.setImage(UIImage(systemName: "stop.fill", withConfiguration: UIImage.SymbolConfiguration(pointSize: 18)), for: .normal)
        stopBtn.tintColor = .white
        stopBtn.translatesAutoresizingMaskIntoConstraints = false
        stopBtn.addTarget(self, action: #selector(onStopTap), for: .touchUpInside)
        stopBg.addSubview(stopBtn)

        NSLayoutConstraint.activate([
            listenLbl.centerXAnchor.constraint(equalTo: recordingView.centerXAnchor),
            listenLbl.topAnchor.constraint(equalTo: recordingView.topAnchor, constant: 16),

            wv.centerXAnchor.constraint(equalTo: recordingView.centerXAnchor),
            wv.topAnchor.constraint(equalTo: listenLbl.bottomAnchor, constant: 12),
            wv.leadingAnchor.constraint(equalTo: recordingView.leadingAnchor, constant: 16),
            wv.trailingAnchor.constraint(equalTo: recordingView.trailingAnchor, constant: -16),
            wv.heightAnchor.constraint(equalToConstant: 110),

            stopBg.centerXAnchor.constraint(equalTo: recordingView.centerXAnchor),
            stopBg.topAnchor.constraint(equalTo: wv.bottomAnchor, constant: 12),
            stopBg.widthAnchor.constraint(equalToConstant: 48),
            stopBg.heightAnchor.constraint(equalToConstant: 48),

            stopBtn.centerXAnchor.constraint(equalTo: stopBg.centerXAnchor),
            stopBtn.centerYAnchor.constraint(equalTo: stopBg.centerYAnchor)
        ])

        // === NEXT KEYBOARD BUTTON ===
        let nkb = UIButton(type: .system)
        nkb.setImage(UIImage(systemName: "globe", withConfiguration: UIImage.SymbolConfiguration(pointSize: 18)), for: .normal)
        nkb.tintColor = .label
        nkb.translatesAutoresizingMaskIntoConstraints = false
        nkb.addTarget(self, action: #selector(handleInputModeList(from:with:)), for: .allTouchEvents)
        view.addSubview(nkb)
        nextKeyboardButton = nkb

        NSLayoutConstraint.activate([
            nkb.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 8),
            nkb.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -8),
            nkb.widthAnchor.constraint(equalToConstant: 36),
            nkb.heightAnchor.constraint(equalToConstant: 36)
        ])

        updateColorsForAppearance()
    }

    @objc private func onMicTap() {
        idleView.isHidden = true
        recordingView.isHidden = false
        waveformView?.startAnimating()
        startAudioCapture()
    }

    @objc private func onStopTap() {
        stopAudioCapture()
        waveformView?.stopAnimating()
        recordingView.isHidden = true
        idleView.isHidden = false
    }

    private var smoothedLevel: Float = 0

    private func startAudioCapture() {
        smoothedLevel = 0
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .default)
            try session.setActive(true)

            let url = FileManager.default.temporaryDirectory.appendingPathComponent("voquill_kb.m4a")
            try? FileManager.default.removeItem(at: url)

            let settings: [String: Any] = [
                AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
                AVSampleRateKey: 44100.0,
                AVNumberOfChannelsKey: 1,
                AVEncoderAudioQualityKey: AVAudioQuality.low.rawValue
            ]

            audioRecorder = try AVAudioRecorder(url: url, settings: settings)
            audioRecorder?.isMeteringEnabled = true
            audioRecorder?.prepareToRecord()
            audioRecorder?.record()

            levelTimer = Timer.scheduledTimer(withTimeInterval: 0.03, repeats: true) { [weak self] _ in
                self?.updateLevels()
            }
        } catch {
            levelTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
                let fakeLevel = CGFloat.random(in: 0.3...0.7)
                self?.waveformView?.updateLevel(fakeLevel)
            }
        }
    }

    private func updateLevels() {
        guard let recorder = audioRecorder, recorder.isRecording else { return }
        recorder.updateMeters()

        let avgPower = recorder.averagePower(forChannel: 0)

        // dB to linear, then apply a curve for better feel
        // avgPower ranges from -160 (silence) to 0 (max)
        // Normalize to 0-1 using a practical range of -50 to 0
        let clampedPower = max(avgPower, -50)
        let normalized = (clampedPower + 50) / 50  // 0 to 1

        // Apply a curve so small sounds are more visible
        let curved = pow(normalized, 0.7)

        // Smooth at the source too for extra stability
        let attack: Float = 0.4
        let decay: Float = 0.4
        let s = curved > smoothedLevel ? attack : decay
        smoothedLevel += (curved - smoothedLevel) * s

        let final = max(smoothedLevel, 0.08)

        waveformView?.updateLevel(CGFloat(final))
    }

    private func stopAudioCapture() {
        levelTimer?.invalidate()
        levelTimer = nil

        audioRecorder?.stop()
        audioRecorder = nil

        try? AVAudioSession.sharedInstance().setActive(false)
    }

    override func viewWillLayoutSubviews() {
        super.viewWillLayoutSubviews()
        nextKeyboardButton?.isHidden = !needsInputModeSwitchKey
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        if !recordingView.isHidden {
            onStopTap()
        }
    }

    override func textWillChange(_ textInput: UITextInput?) {}
    override func textDidChange(_ textInput: UITextInput?) {}
}
