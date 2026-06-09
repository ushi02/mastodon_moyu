import AppKit
import Foundation

let outputPath = CommandLine.arguments.dropFirst().first ?? "/private/tmp/touchfish-transparent-icon.png"
let size = 1024
let scale = CGFloat(size) / 512.0

func point(_ x: CGFloat, _ y: CGFloat) -> NSPoint {
    NSPoint(x: x * scale, y: CGFloat(size) - (y * scale))
}

guard
    let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: size,
        pixelsHigh: size,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    )
else {
    fputs("Failed to create bitmap image rep.\n", stderr)
    exit(1)
}

bitmap.size = NSSize(width: size, height: size)

NSGraphicsContext.saveGraphicsState()
guard let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
    fputs("Failed to create graphics context.\n", stderr)
    exit(1)
}

NSGraphicsContext.current = context

NSColor.clear.setFill()
NSRect(x: 0, y: 0, width: size, height: size).fill()

let strokeColor = NSColor(
    calibratedRed: 0.553,
    green: 0.596,
    blue: 0.545,
    alpha: 1
)
strokeColor.setStroke()

let body = NSBezierPath()
body.move(to: point(159, 249))
body.curve(to: point(390, 256), controlPoint1: point(214, 160), controlPoint2: point(327, 159))
body.curve(to: point(159, 263), controlPoint1: point(329, 352), controlPoint2: point(215, 352))
body.curve(to: point(101, 197), controlPoint1: point(143, 238), controlPoint2: point(128, 219))
body.curve(to: point(141, 276), controlPoint1: point(105, 230), controlPoint2: point(117, 255))
body.curve(to: point(101, 344), controlPoint1: point(120, 291), controlPoint2: point(106, 313))
body.curve(to: point(159, 263), controlPoint1: point(129, 321), controlPoint2: point(145, 301))
body.lineWidth = 30 * scale
body.lineCapStyle = .round
body.lineJoinStyle = .round
body.stroke()

let eye = NSBezierPath()
eye.appendArc(withCenter: point(338, 237), radius: 12 * scale, startAngle: 0, endAngle: 360)
eye.lineWidth = 24 * scale
eye.lineCapStyle = .round
eye.lineJoinStyle = .round
eye.stroke()

NSGraphicsContext.restoreGraphicsState()

guard let pngData = bitmap.representation(using: .png, properties: [:]) else {
    fputs("Failed to encode PNG.\n", stderr)
    exit(1)
}

let outputURL = URL(fileURLWithPath: outputPath)
try FileManager.default.createDirectory(
    at: outputURL.deletingLastPathComponent(),
    withIntermediateDirectories: true
)
try pngData.write(to: outputURL)
print(outputPath)
