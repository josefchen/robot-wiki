declare module 'draco3d' {
  // The draco3d package ships no type declarations. Only the encoder/decoder
  // module factories are used, by scripts/convert-so101-meshes.ts.
  const draco3d: {
    createDecoderModule(): Promise<unknown>;
    createEncoderModule(): Promise<unknown>;
  };
  export default draco3d;
}
