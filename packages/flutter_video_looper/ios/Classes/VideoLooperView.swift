import AVFoundation
import AVKit
import Flutter
import UIKit

class VideoLooperView: NSObject, FlutterPlatformView {
    private let playerView: PlayerContainerView
    private var player: AVQueuePlayer?
    private var playerLooper: AVPlayerLooper?
    private var pipController: AVPictureInPictureController?
    private let channel: FlutterMethodChannel
    private let isPipEnabled: Bool
    private var statusObservation: NSKeyValueObservation?

    init(
        frame: CGRect,
        viewId: Int64,
        args: [String: Any]?,
        messenger: FlutterBinaryMessenger,
        registrar: FlutterPluginRegistrar
    ) {
        playerView = PlayerContainerView(frame: frame)
        playerView.backgroundColor = .black
        playerView.playerLayer.videoGravity = .resizeAspect
        isPipEnabled = args?["isPipEnabled"] as? Bool ?? false
        channel = FlutterMethodChannel(
            name: "flutter_video_looper_\(viewId)",
            binaryMessenger: messenger
        )

        super.init()

        channel.setMethodCallHandler(handle)

        guard let assetPath = args?["assetPath"] as? String else { return }
        let key = registrar.lookupKey(forAsset: assetPath)
        guard let path = Bundle.main.path(forResource: key, ofType: nil) else { return }
        let url = URL(fileURLWithPath: path)

        let templateItem = AVPlayerItem(url: url)
        let queuePlayer = AVQueuePlayer()
        playerLooper = AVPlayerLooper(player: queuePlayer, templateItem: templateItem)
        playerView.playerLayer.player = queuePlayer
        player = queuePlayer

        if isPipEnabled {
            configureAudioSession()
            statusObservation = queuePlayer.observe(\.timeControlStatus, options: [.new]) { [weak self] player, _ in
                if player.timeControlStatus == .playing {
                    self?.statusObservation = nil
                    DispatchQueue.main.async { self?.configurePip() }
                }
            }
        }

        queuePlayer.play()
    }

    func view() -> UIView { playerView }

    private func configureAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {}
    }

    private func configurePip() {
        guard AVPictureInPictureController.isPictureInPictureSupported() else { return }
        pipController = AVPictureInPictureController(playerLayer: playerView.playerLayer)
        if #available(iOS 14.2, *) {
            pipController?.canStartPictureInPictureAutomaticallyFromInline = true
        }

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(willResignActive),
            name: UIApplication.willResignActiveNotification,
            object: nil
        )
    }

    @objc private func willResignActive() {
        if pipController?.isPictureInPictureActive == false {
            pipController?.startPictureInPicture()
        }
    }

    private func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        switch call.method {
        case "enterPip":
            pipController?.startPictureInPicture()
            result(nil)
        case "dispose":
            cleanup()
            result(nil)
        default:
            result(FlutterMethodNotImplemented)
        }
    }

    private func cleanup() {
        player?.pause()
        playerLooper?.disableLooping()
        statusObservation = nil
        pipController = nil
        NotificationCenter.default.removeObserver(self)
    }

    deinit { cleanup() }
}

private class PlayerContainerView: UIView {
    override class var layerClass: AnyClass { AVPlayerLayer.self }
    var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }
}
