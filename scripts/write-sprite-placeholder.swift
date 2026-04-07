import AppKit
import CoreGraphics

let W = 1600
let H = 1600
let stripH = 161
let colors: [(CGFloat, CGFloat, CGFloat)] = [
  (0.12, 0.22, 0.42),
  (0.25, 0.12, 0.38),
  (0.15, 0.28, 0.48),
  (0.42, 0.18, 0.12),
]

guard let cs = CGColorSpace(name: CGColorSpace.sRGB) else { fatalError("cs") }
let bytesPerRow = W * 4
var data = [UInt8](repeating: 0, count: W * H * 4)

data.withUnsafeMutableBytes { raw in
  guard let ctx = CGContext(
    data: raw.baseAddress,
    width: W,
    height: H,
    bitsPerComponent: 8,
    bytesPerRow: bytesPerRow,
    space: cs,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
  ) else { fatalError("ctx") }

  ctx.clear(CGRect(x: 0, y: 0, width: W, height: H))

  for i in 0 ..< 4 {
    let c = colors[i]
    ctx.setFillColor(red: c.0, green: c.1, blue: c.2, alpha: 1)
    let x = CGFloat(i * 80)
    ctx.fill(CGRect(x: x, y: CGFloat(H - stripH), width: 80, height: CGFloat(stripH)))
  }
}

let url = URL(fileURLWithPath: CommandLine.arguments[1])
let bitmapInfo = CGBitmapInfo.byteOrder32Big.union(CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue))
guard let provider = CGDataProvider(data: Data(data) as CFData),
      let cgImage = CGImage(
        width: W,
        height: H,
        bitsPerComponent: 8,
        bitsPerPixel: 32,
        bytesPerRow: bytesPerRow,
        space: cs,
        bitmapInfo: bitmapInfo,
        provider: provider,
        decode: nil,
        shouldInterpolate: true,
        intent: .defaultIntent
      ) else { fatalError("cgimg") }

let dest = CGImageDestinationCreateWithURL(url as CFURL, "public.png" as CFString, 1, nil)!
CGImageDestinationAddImage(dest, cgImage, nil)
guard CGImageDestinationFinalize(dest) else { fatalError("write") }
print("ok", url.path)
