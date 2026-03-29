import { NextResponse } from 'next/server';
import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const tex = new TeX({ packages: AllPackages });
// Set fontCache: 'none' so that paths are not bundled into <defs> and <use> refs,
// which is required to animate <path> elements with Framer Motion.
const svg = new SVG({ fontCache: 'none' });
const html = mathjax.document('', { InputJax: tex, OutputJax: svg });

export async function POST(request: Request) {
    try {
        const { latex, display } = await request.json();
        
        if (!latex) {
            return NextResponse.json({ error: 'LaTeX string is required' }, { status: 400 });
        }

        const node = html.convert(latex, { display: display !== false });
        const svgString = adaptor.innerHTML(node);
        
        return NextResponse.json({ svg: svgString });
    } catch (error: any) {
        console.error('MathJax Conversion Error:', error);
        return NextResponse.json({ error: 'Failed to convert LaTeX to SVG' }, { status: 500 });
    }
}
