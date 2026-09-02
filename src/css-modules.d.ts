// Ambient type declarations for side-effect CSS imports used by Expo web
// (animated-icon.module.css and global.css). Native builds ignore these
// files entirely; the web pipeline imports them. Without this shim
// `tsc --noEmit` fails to resolve the module.
declare module '*.css';
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
