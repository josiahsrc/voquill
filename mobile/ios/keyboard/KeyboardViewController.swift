import UIKit
import AVFoundation

// MARK: - Audio Waveform

class AudioWaveformView: UIView {
    private var displayLink: CADisplayLink?
    private var phase: CGFloat = 0
    private var currentLevel: CGFloat = 0.0
    private var targetLevel: CGFloat = 0.0

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
            // Draw flat line when idle
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

        // Track line
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

        // Head moves with easeInOut across the full range
        let headT = easeInOut(min(t * 1.2, 1.0))
        let head = -0.1 + headT * 1.2

        // Tail starts later and catches up
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

    private var waveformView: AudioWaveformView!
    private var progressView: IndeterminateProgressView!
    private var pillButton: UIView!
    private var pillIcon: UIImageView!
    private var pillLabel: UILabel!
    private var nextKeyboardButton: UIButton?
    private var labelToIconConstraint: NSLayoutConstraint!
    private var labelCenteredConstraint: NSLayoutConstraint!

    private var audioRecorder: AVAudioRecorder?
    private var levelTimer: Timer?
    private var smoothedLevel: Float = 0

    override func viewDidLoad() {
        super.viewDidLoad()
        buildUI()
        applyPhase(.idle, animated: false)
    }

    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        updateColorsForAppearance()
    }

    private func updateColorsForAppearance() {
        let isDark = traitCollection.userInterfaceStyle == .dark
        let activeColor: UIColor = isDark ? .white : .black
        let idleColor: UIColor = isDark ? UIColor.white.withAlphaComponent(0.25) : UIColor.black.withAlphaComponent(0.2)
        progressView.barColor = activeColor

        switch currentPhase {
        case .idle:
            waveformView.waveColor = idleColor
        case .recording:
            waveformView.waveColor = activeColor
        case .loading:
            progressView.barColor = activeColor
        }
    }

    private func buildUI() {
        view.backgroundColor = .clear

        let hc = view.heightAnchor.constraint(equalToConstant: 250)
        hc.priority = .defaultHigh
        hc.isActive = true

        // === WAVEFORM ===
        waveformView = AudioWaveformView()
        waveformView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(waveformView)

        // === PROGRESS ===
        progressView = IndeterminateProgressView()
        progressView.translatesAutoresizingMaskIntoConstraints = false
        progressView.alpha = 0
        view.addSubview(progressView)

        NSLayoutConstraint.activate([
            waveformView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            waveformView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            waveformView.topAnchor.constraint(equalTo: view.topAnchor, constant: 20),
            waveformView.heightAnchor.constraint(equalToConstant: 110),

            progressView.leadingAnchor.constraint(equalTo: waveformView.leadingAnchor),
            progressView.trailingAnchor.constraint(equalTo: waveformView.trailingAnchor),
            progressView.topAnchor.constraint(equalTo: waveformView.topAnchor),
            progressView.heightAnchor.constraint(equalTo: waveformView.heightAnchor)
        ])

        // === PILL BUTTON ===
        pillButton = UIView()
        pillButton.translatesAutoresizingMaskIntoConstraints = false
        pillButton.backgroundColor = UIColor(red: 0.2, green: 0.5, blue: 1.0, alpha: 1.0)
        pillButton.layer.cornerRadius = 24
        pillButton.isUserInteractionEnabled = true
        view.addSubview(pillButton)

        let tap = UITapGestureRecognizer(target: self, action: #selector(onPillTap))
        pillButton.addGestureRecognizer(tap)

        pillIcon = UIImageView()
        pillIcon.translatesAutoresizingMaskIntoConstraints = false
        pillIcon.tintColor = .white
        pillIcon.contentMode = .scaleAspectFit
        pillButton.addSubview(pillIcon)

        pillLabel = UILabel()
        pillLabel.translatesAutoresizingMaskIntoConstraints = false
        pillLabel.textColor = .white
        pillLabel.font = .systemFont(ofSize: 15, weight: .semibold)
        pillButton.addSubview(pillLabel)

        NSLayoutConstraint.activate([
            pillButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            pillButton.topAnchor.constraint(equalTo: waveformView.bottomAnchor, constant: 16),
            pillButton.heightAnchor.constraint(equalToConstant: 48),

            pillIcon.leadingAnchor.constraint(equalTo: pillButton.leadingAnchor, constant: 20),
            pillIcon.centerYAnchor.constraint(equalTo: pillButton.centerYAnchor),
            pillIcon.widthAnchor.constraint(equalToConstant: 20),
            pillIcon.heightAnchor.constraint(equalToConstant: 20),

            pillLabel.trailingAnchor.constraint(equalTo: pillButton.trailingAnchor, constant: -20),
            pillLabel.centerYAnchor.constraint(equalTo: pillButton.centerYAnchor)
        ])

        // === NEXT KEYBOARD ===
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

        labelToIconConstraint = pillLabel.leadingAnchor.constraint(equalTo: pillIcon.trailingAnchor, constant: 8)
        labelCenteredConstraint = pillLabel.leadingAnchor.constraint(equalTo: pillButton.leadingAnchor, constant: 20)
        labelToIconConstraint.isActive = true

        waveformView.startAnimating()
        updateColorsForAppearance()
    }

    private func applyPhase(_ phase: Phase, animated: Bool) {
        currentPhase = phase
        let isDark = traitCollection.userInterfaceStyle == .dark
        let activeColor: UIColor = isDark ? .white : .black
        let idleColor: UIColor = isDark ? UIColor.white.withAlphaComponent(0.25) : UIColor.black.withAlphaComponent(0.2)

        let changes: () -> Void
        switch phase {
        case .idle:
            changes = {
                self.waveformView.alpha = 1
                self.progressView.alpha = 0
                self.waveformView.isActive = false
                self.waveformView.waveColor = idleColor
                self.pillButton.backgroundColor = UIColor(red: 0.2, green: 0.5, blue: 1.0, alpha: 1.0)
                self.pillIcon.image = UIImage(systemName: "mic.fill", withConfiguration: UIImage.SymbolConfiguration(pointSize: 16, weight: .semibold))
                self.pillIcon.isHidden = false
                self.labelCenteredConstraint.isActive = false
                self.labelToIconConstraint.isActive = true
                self.pillLabel.text = "Tap to dictate"
                self.pillButton.isUserInteractionEnabled = true
            }
            progressView.stopAnimating()

        case .recording:
            changes = {
                self.waveformView.alpha = 1
                self.progressView.alpha = 0
                self.waveformView.isActive = true
                self.waveformView.waveColor = activeColor
                self.pillButton.backgroundColor = .systemRed
                self.pillIcon.image = UIImage(systemName: "stop.fill", withConfiguration: UIImage.SymbolConfiguration(pointSize: 14, weight: .semibold))
                self.pillIcon.isHidden = false
                self.labelCenteredConstraint.isActive = false
                self.labelToIconConstraint.isActive = true
                self.pillLabel.text = "Stop dictating"
                self.pillButton.isUserInteractionEnabled = true
            }

        case .loading:
            changes = {
                self.waveformView.alpha = 0
                self.progressView.alpha = 1
                self.pillButton.backgroundColor = UIColor.systemGray3
                self.pillIcon.image = nil
                self.pillIcon.isHidden = true
                self.labelToIconConstraint.isActive = false
                self.labelCenteredConstraint.isActive = true
                self.pillLabel.text = "Loading..."
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

    private static let appGroupId = "group.com.voquill.app"

    @objc private func onPillTap() {
        switch currentPhase {
        case .idle:
            applyPhase(.recording, animated: true)
            startAudioCapture()
        case .recording:
            stopAudioCapture()
            applyPhase(.loading, animated: true)
            handleTranscription()
        case .loading:
            break
        }
    }

    // MARK: - Transcription

    private var lastDebugLog: String = ""

    private func dbg(_ msg: String) {
        NSLog("[VoquillKB] %@", msg)
        lastDebugLog = msg
    }

    private func handleTranscription() {
        guard hasFullAccess else {
            DispatchQueue.main.async {
                self.textDocumentProxy.insertText("[Enable Full Access in Settings > Voquill Keyboard]")
                self.applyPhase(.idle, animated: true)
            }
            return
        }

        fetchIdToken { [weak self] idToken in
            guard let self = self else { return }

            guard let idToken = idToken else {
                DispatchQueue.main.async {
                    self.textDocumentProxy.insertText("[Auth failed: \(self.lastDebugLog)]")
                    self.applyPhase(.idle, animated: true)
                }
                return
            }

            guard let defaults = UserDefaults(suiteName: KeyboardViewController.appGroupId),
                  let functionUrl = defaults.string(forKey: "voquill_function_url") else {
                DispatchQueue.main.async {
                    self.textDocumentProxy.insertText("[Missing function URL]")
                    self.applyPhase(.idle, animated: true)
                }
                return
            }

            let audioUrl = FileManager.default.temporaryDirectory.appendingPathComponent("voquill_kb.m4a")

            Task { [weak self] in
                guard let self = self else { return }
                do {
                    let transcribeRepo = CloudTranscribeAudioRepo(functionUrl: functionUrl, idToken: idToken)
                    let rawTranscript = try await transcribeRepo.transcribe(audioFileURL: audioUrl)

                    guard !rawTranscript.isEmpty else {
                        await MainActor.run {
                            self.textDocumentProxy.insertText("[No speech detected]")
                            self.applyPhase(.idle, animated: true)
                        }
                        return
                    }

                    let generateRepo = CloudGenerateTextRepo(functionUrl: functionUrl, idToken: idToken)
                    var finalText = rawTranscript
                    do {
                        finalText = try await generateRepo.generate(
                            system: "Replace every other word with the word 'bacon'",
                            prompt: rawTranscript
                        )
                    } catch {
                        self.dbg("Post-processing failed, using raw transcript: \(error.localizedDescription)")
                    }

                    await MainActor.run {
                        self.textDocumentProxy.insertText(finalText)
                        self.applyPhase(.idle, animated: true)
                    }
                } catch {
                    self.dbg("Transcription failed: \(error.localizedDescription)")
                    await MainActor.run {
                        self.textDocumentProxy.insertText("[Transcription failed: \(error.localizedDescription)]")
                        self.applyPhase(.idle, animated: true)
                    }
                }
            }
        }
    }

    private var cachedIdToken: String?
    private var cachedIdTokenExpiry: Date?

    private func fetchIdToken(completion: @escaping (String?) -> Void) {
        if let token = cachedIdToken, let expiry = cachedIdTokenExpiry, Date() < expiry {
            dbg("Using cached ID token, expires \(expiry)")
            completion(token)
            return
        }

        guard let defaults = UserDefaults(suiteName: KeyboardViewController.appGroupId) else {
            dbg("UserDefaults not accessible for group \(KeyboardViewController.appGroupId)")
            completion(nil)
            return
        }

        let apiRefreshToken = defaults.string(forKey: "voquill_api_refresh_token")
        let functionUrl = defaults.string(forKey: "voquill_function_url")
        let apiKey = defaults.string(forKey: "voquill_api_key")
        let authUrl = defaults.string(forKey: "voquill_auth_url")

        let missing = [
            apiRefreshToken == nil ? "apiRefreshToken" : nil,
            functionUrl == nil ? "functionUrl" : nil,
            apiKey == nil ? "apiKey" : nil,
            authUrl == nil ? "authUrl" : nil,
        ].compactMap { $0 }

        guard missing.isEmpty,
              let apiRefreshToken = apiRefreshToken,
              let functionUrl = functionUrl,
              let apiKey = apiKey,
              let authUrl = authUrl else {
            dbg("Missing keys in UserDefaults: \(missing.joined(separator: ", "))")
            completion(nil)
            return
        }

        dbg("Step 1: refreshApiToken → \(functionUrl)")
        refreshApiToken(functionUrl: functionUrl, apiRefreshToken: apiRefreshToken) { [weak self] customToken in
            guard let self = self else { return }
            guard let customToken = customToken else {
                completion(nil)
                return
            }
            self.dbg("Step 2: exchangeCustomToken → \(authUrl)")
            self.exchangeCustomToken(authUrl: authUrl, apiKey: apiKey, customToken: customToken) { [weak self] idToken, expiresIn in
                guard let self = self, let idToken = idToken, let expiresIn = expiresIn else {
                    completion(nil)
                    return
                }
                self.cachedIdToken = idToken
                self.cachedIdTokenExpiry = Date().addingTimeInterval(expiresIn - 300)
                self.dbg("ID token acquired, expiresIn=\(expiresIn)s")
                completion(idToken)
            }
        }
    }

    private func refreshApiToken(functionUrl: String, apiRefreshToken: String, completion: @escaping (String?) -> Void) {
        guard let url = URL(string: functionUrl) else {
            dbg("refreshApiToken: invalid URL: \(functionUrl)")
            completion(nil)
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let payload: [String: Any] = [
            "data": [
                "name": "auth/refreshApiToken",
                "args": ["apiRefreshToken": apiRefreshToken]
            ]
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            let statusCode = (response as? HTTPURLResponse)?.statusCode
            if let error = error {
                self?.dbg("refreshApiToken: network error: \(error.localizedDescription)")
                completion(nil)
                return
            }
            guard let data = data else {
                self?.dbg("refreshApiToken: no data, status=\(statusCode ?? -1)")
                completion(nil)
                return
            }
            let bodyStr = String(data: data, encoding: .utf8) ?? "<non-utf8>"
            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                self?.dbg("refreshApiToken: not JSON, status=\(statusCode ?? -1), body=\(bodyStr.prefix(300))")
                completion(nil)
                return
            }
            guard let result = json["result"] as? [String: Any],
                  let apiToken = result["apiToken"] as? String else {
                self?.dbg("refreshApiToken: unexpected response, status=\(statusCode ?? -1), json=\(json)")
                completion(nil)
                return
            }
            self?.dbg("refreshApiToken: success, status=\(statusCode ?? -1)")
            completion(apiToken)
        }.resume()
    }

    private func exchangeCustomToken(authUrl: String, apiKey: String, customToken: String, completion: @escaping (String?, TimeInterval?) -> Void) {
        let urlString = "\(authUrl)/v1/accounts:signInWithCustomToken?key=\(apiKey)"
        guard let url = URL(string: urlString) else {
            dbg("exchangeCustomToken: invalid URL: \(urlString)")
            completion(nil, nil)
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = [
            "token": customToken,
            "returnSecureToken": true
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            let statusCode = (response as? HTTPURLResponse)?.statusCode
            if let error = error {
                self?.dbg("exchangeCustomToken: network error: \(error.localizedDescription)")
                completion(nil, nil)
                return
            }
            guard let data = data else {
                self?.dbg("exchangeCustomToken: no data, status=\(statusCode ?? -1)")
                completion(nil, nil)
                return
            }
            let bodyStr = String(data: data, encoding: .utf8) ?? "<non-utf8>"
            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                self?.dbg("exchangeCustomToken: not JSON, status=\(statusCode ?? -1), body=\(bodyStr.prefix(300))")
                completion(nil, nil)
                return
            }
            guard let idToken = json["idToken"] as? String,
                  let expiresInStr = json["expiresIn"] as? String,
                  let expiresIn = TimeInterval(expiresInStr) else {
                self?.dbg("exchangeCustomToken: unexpected response, status=\(statusCode ?? -1), json=\(json)")
                completion(nil, nil)
                return
            }
            self?.dbg("exchangeCustomToken: success, status=\(statusCode ?? -1)")
            completion(idToken, expiresIn)
        }.resume()
    }

    // MARK: - Audio

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
            // Fallback simulated
            levelTimer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] _ in
                self?.waveformView?.updateLevel(CGFloat.random(in: 0.3...0.7))
            }
        }
    }

    private func updateLevels() {
        guard let recorder = audioRecorder, recorder.isRecording else { return }
        recorder.updateMeters()

        let avgPower = recorder.averagePower(forChannel: 0)
        let clampedPower = max(avgPower, -50)
        let normalized = (clampedPower + 50) / 50
        let curved = pow(normalized, 0.7)

        let attack: Float = 0.4
        let decay: Float = 0.4
        let s = curved > smoothedLevel ? attack : decay
        smoothedLevel += (curved - smoothedLevel) * s

        waveformView.updateLevel(CGFloat(max(smoothedLevel, 0.08)))
    }

    private func stopAudioCapture() {
        levelTimer?.invalidate()
        levelTimer = nil
        audioRecorder?.stop()
        audioRecorder = nil
        try? AVAudioSession.sharedInstance().setActive(false)
    }

    // MARK: - System

    override func viewWillLayoutSubviews() {
        super.viewWillLayoutSubviews()
        nextKeyboardButton?.isHidden = !needsInputModeSwitchKey
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        if currentPhase == .recording {
            stopAudioCapture()
        }
        waveformView.stopAnimating()
        progressView.stopAnimating()
    }

    override func textWillChange(_ textInput: UITextInput?) {}
    override func textDidChange(_ textInput: UITextInput?) {}
}
