// Memo-ry Receiver: a menu-bar app that keeps the sync receiver (Resources/memo-ry-receiver, compiled from
// mac/server.ts) running, restarts it if it stops, and starts at login. Built by mac/build-app.ts.
import AppKit
import ServiceManagement

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var statusItem: NSStatusItem!
    private var server: Process?
    private var quitting = false
    private var restarts = 0
    private var lastLine = ""
    private var lastAt: Date?
    private let stateItem = NSMenuItem(title: "Starting…", action: nil, keyEquivalent: "")
    private let lastItem = NSMenuItem(title: "No files yet", action: nil, keyEquivalent: "")
    private let loginItem = NSMenuItem(title: "Start at login", action: #selector(toggleLogin), keyEquivalent: "")
    private let logURL = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Logs/memo-ry-receiver.log")
    private let libraryURL = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Music/Memo-ry")

    func applicationDidFinishLaunching(_ notification: Notification) {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        let image = NSImage(systemSymbolName: "waveform", accessibilityDescription: "Memo-ry")
        image?.isTemplate = true
        statusItem.button?.image = image

        let menu = NSMenu()
        menu.autoenablesItems = false
        stateItem.isEnabled = false
        lastItem.isEnabled = false
        menu.addItem(stateItem)
        menu.addItem(lastItem)
        menu.addItem(.separator())
        menu.addItem(withTitle: "Pair a phone…", action: #selector(openPairing), keyEquivalent: "p").target = self
        menu.addItem(withTitle: "Open Memo-ry folder", action: #selector(openLibrary), keyEquivalent: "o").target = self
        menu.addItem(withTitle: "Show log", action: #selector(openLog), keyEquivalent: "").target = self
        menu.addItem(.separator())
        loginItem.target = self
        menu.addItem(loginItem)
        menu.addItem(.separator())
        menu.addItem(withTitle: "Quit Memo-ry Receiver", action: #selector(quit), keyEquivalent: "q").target = self
        statusItem.menu = menu

        // First launch: start at login, since that is the point of the app.
        if !UserDefaults.standard.bool(forKey: "loginConfigured") {
            UserDefaults.standard.set(true, forKey: "loginConfigured")
            try? SMAppService.mainApp.register()
        }
        refreshLoginItem()
        startServer()
    }

    // MARK: server

    private func port() -> Int {
        let config = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".config/memo-ry/receiver.json")
        if let data = try? Data(contentsOf: config),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let port = json["port"] as? Int {
            return port
        }
        return 7337
    }

    private func startServer() {
        guard let binary = Bundle.main.url(forResource: "memo-ry-receiver", withExtension: nil) else {
            setState("Receiver binary missing")
            return
        }
        if !FileManager.default.fileExists(atPath: logURL.path) {
            FileManager.default.createFile(atPath: logURL.path, contents: nil)
        }
        let log = try? FileHandle(forWritingTo: logURL)
        log?.seekToEndOfFile()

        let process = Process()
        process.executableURL = binary
        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = pipe
        pipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty else { return }
            log?.write(data)
            if let text = String(data: data, encoding: .utf8) {
                DispatchQueue.main.async { self?.handleOutput(text) }
            }
        }
        process.terminationHandler = { [weak self] _ in
            DispatchQueue.main.async { self?.serverStopped() }
        }
        do {
            try process.run()
            server = process
            setState("Running · port \(port())")
        } catch {
            setState("Couldn't start: \(error.localizedDescription)")
        }
    }

    private func serverStopped() {
        server = nil
        if quitting { return }
        restarts += 1
        setState("Stopped · restarting…")
        let delay = min(30.0, Double(restarts) * 2)
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in self?.startServer() }
    }

    /// Server lines look like "23:51:02 ↓ Money Trees/lyrics.md" (↓ = arrived from the phone).
    private func handleOutput(_ text: String) {
        for line in text.split(separator: "\n") {
            if line.contains("Listening on") { restarts = 0 }
            guard let arrow = line.range(of: "↓ ") ?? line.range(of: "↑ ") else { continue }
            let path = String(line[arrow.upperBound...])
            let name = (path as NSString).lastPathComponent
            let from = line[arrow.lowerBound...].hasPrefix("↓") ? "From phone" : "To phone"
            lastLine = "\(from): \(name)"
            lastAt = Date()
        }
        if let at = lastAt {
            let f = DateFormatter()
            f.timeStyle = .short
            lastItem.title = "\(lastLine) · \(f.string(from: at))"
        }
    }

    private func setState(_ text: String) {
        stateItem.title = text
        statusItem.button?.appearsDisabled = server == nil
    }

    // MARK: actions

    @objc private func openPairing() {
        NSWorkspace.shared.open(URL(string: "http://localhost:\(port())/pair")!)
    }

    @objc private func openLibrary() {
        try? FileManager.default.createDirectory(at: libraryURL, withIntermediateDirectories: true)
        NSWorkspace.shared.open(libraryURL)
    }

    @objc private func openLog() {
        NSWorkspace.shared.open(logURL)
    }

    @objc private func toggleLogin() {
        let service = SMAppService.mainApp
        do {
            if service.status == .enabled {
                try service.unregister()
            } else {
                try service.register()
            }
        } catch {
            SMAppService.openSystemSettingsLoginItems()
        }
        refreshLoginItem()
    }

    private func refreshLoginItem() {
        let status = SMAppService.mainApp.status
        loginItem.state = status == .enabled ? .on : .off
        loginItem.title = status == .requiresApproval ? "Start at login (allow in System Settings)" : "Start at login"
    }

    @objc private func quit() {
        quitting = true
        server?.terminate()
        NSApp.terminate(nil)
    }

    func applicationWillTerminate(_ notification: Notification) {
        quitting = true
        server?.terminate()
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.accessory)
app.run()
