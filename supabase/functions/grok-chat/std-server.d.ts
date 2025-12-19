declare module 'std/server' {
    export function serve(handler: (req: any) => any): void;
}
