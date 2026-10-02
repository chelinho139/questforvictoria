// Pixel-art source maps. Each string row is one pixel row; characters index a palette.
// '.' is transparent. For icons: 'x' = base colour, 'l' = lighter, 'd' = darker, others from ICON_PAL.

export const ICON_PAL: Record<string, string> = {
  w: '#f4f1e6',
  k: '#161a24',
  g: '#f2c14e',
  r: '#e0504b',
  s: '#8fa3c1',
  b: '#6b4a2b',
};

export const ICONS: Record<string, string[]> = {
  thrust: ['...........w','..........wl','.........wld','........wld.','.......wld..','......wld...','.gg..wld....','..gg.ld.....','..gggg......','.bbggg......','bbb..gg.....','bb..........'],
  slash: ['..xl......xl','...xl......x','....xl......','.....xl.....','xl....xl....','.xl....xl...','..xl....xl..','...xl....xl.','....xl....xl','.....xl....x','......xl....','.......xl...'],
  rend: ['.....x......','.....x......','....xxx.....','....xlx.....','...xxlxx....','...xxwxx....','..xxxwxxx...','..xxxxxxx...','..xxxxxxd...','..xxxxxdd...','...xxxdd....','....ddd.....'],
  whirlwind: ['.lxxxxxxxxl.','..xllxxxxx..','...xxxxxx...','..xxlxxxxx..','...xxxxxx...','....xlxxx...','....xxxx....','.....xlx....','.....xxx....','......xx....','......x.....','.....dd.....'],
  warcry: ['........l...','......x..l..','....xxx...l.','..xxxxx.l.l.','xxxxxxx..l.l','xlxxxxx..l.l','xlxxxxx..l.l','xxxxxxx..l.l','..xxxxx.l.l.','....xxx...l.','......x..l..','........l...'],
  charge: ['.......x....','.......xx...','.......xxx..','l..xxxxxxxx.','ll.xllllllxx','l..xxxxxxxxx','...xxxxxxxx.','l..xxxxxxx..','ll.....xxx..','l......xx...','.......x....','............'],
  interrupt: ['xxxxxxxxxxxx','xlxxxxxxxxlx','xxwxxxxxxwxx','xxxwxxxxwxxx','xxxxwxxwxxxx','xxxxxwwxxxxx','.xxxxwwxxxx.','.xxxwxxwxxx.','..xwxxxxwx..','...xxxxxx...','....dxxd....','.....dd.....'],
  execute: ['...wwwwww...','..wwwwwwww..','.wwwwwwwwww.','.wwwwwwwwww.','.wwxxwwxxww.','.wwxxwwxxww.','.wwwwwwwwww.','..wwwwkkww..','..wwwwwwww..','...w.ww.w...','...wwwwww...','....w.w.w...'],
  mount: ['......xx....','.....xxxx...','....xxxxxx..','...xxxxxwx..','..xxxxxxxxx.','.xxxlxxxxx..','xxxxlxx.....','xxxxxxx.....','xxxxxxx.....','xxx.xxx.....','xxx.xxx.....','dd..dd......'],
  target: ['.....xx.....','....xxxx....','..xxxxxxxx..','.xxx....xxx.','.xx......xx.','xxx..ww..xxx','xxx..ww..xxx','.xx......xx.','.xxx....xxx.','..xxxxxxxx..','....xxxx....','.....xx.....'],
  mortal: ['......xxxx..','.....xxlx...','....xxlx....','...xxlx.....','..xxlxxxxx..','.xxxxxxxxx..','.xxxxxxlx...','.....xxlx...','....xxlx....','...xxlx.....','..xxx.......','.xx.........'],
  lock: ['....xxxx....','...xx..xx...','...x....x...','...x....x...','.xxxxxxxxxx.','.xxxxxxxxxx.','.xxxxddxxxx.','.xxxxddxxxx.','.xxxxxdxxxx.','.xxxxxxxxxx.','.xxxxxxxxxx.','............'],
  gear: ['.....xx.....','..xx.xx.xx..','..xxxxxxxx..','...xxddxx...','.xxxd..dxxx.','.xxd....dxx.','.xxd....dxx.','.xxxd..dxxx.','...xxddxx...','..xxxxxxxx..','..xx.xx.xx..','.....xx.....'],
  rev: ['...xxxxx.x..','..xx...xxx..','.xx.....xx..','.x.......x..','.x..........','.x..........','..........x.','..........x.','..x.......x.','..xx.....xx.','..xxx...xx..','..x.xxxxx...'],
};

export interface SpriteMap {
  rows: string[];
  pal: Record<string, string>;
}

export const SUN: SpriteMap = {
  pal: { o: '#f2a43a', y: '#f7d154', w: '#fff3b0' },
  rows: ['.....o.....','.o...o...o.','..o.....o..','....yyy....','...ywwyy...','oo.ywyyy.oo','...yyyyy...','....yyy....','..o.....o..','.o...o...o.','.....o.....'],
};

export const MOON: SpriteMap = {
  pal: { m: '#e8ecf5', d: '#aab4c8' },
  rows: ['..mmmm...','.mmmd....','mmmd.....','mmmd.....','mmmd.....','mmmd.....','.mmmd....','..mmmm...'],
};

/** Goblin sprite tints per kind index: goblin, shaman, ogre. */
