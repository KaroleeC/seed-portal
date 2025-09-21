declare module 'compression' {
  import { Request, Response } from 'express';
  interface CompressionOptions {
    threshold?: number;
    filter?: (req: Request, res: Response) => boolean;
    level?: number;
  }
  function compression(options?: CompressionOptions): any;
  namespace compression {
    function filter(req: Request, res: Response): boolean;
  }
  export = compression;
}
