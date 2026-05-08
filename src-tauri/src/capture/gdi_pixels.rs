pub fn normalize_bgra_to_rgba_opaque(buf: &mut [u8]) {
    for px in buf.chunks_exact_mut(4) {
        let b = px[0];
        let r = px[2];
        px[0] = r;
        px[2] = b;
        // GDI BI_RGB does not provide a meaningful alpha channel.
        px[3] = 255;
    }
}

#[cfg(test)]
mod tests {
    use super::normalize_bgra_to_rgba_opaque;

    #[test]
    fn converts_bgra_to_rgba_and_forces_alpha() {
        let mut buf = vec![
            0x10, 0x20, 0x30, 0x00, // B G R A
            0xAA, 0xBB, 0xCC, 0x7F,
        ];

        normalize_bgra_to_rgba_opaque(&mut buf);

        assert_eq!(
            buf,
            vec![
                0x30, 0x20, 0x10, 0xFF,
                0xCC, 0xBB, 0xAA, 0xFF,
            ]
        );
    }
}
