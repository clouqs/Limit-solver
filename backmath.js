document.addEventListener('DOMContentLoaded', function() {
    // Initialize MathQuill fields
    const functionInput = MQ.MathField(document.getElementById('function-input'), {
        spaceBehavesLikeTab: true,
        handlers: {
            edit: function() {}
        }
    });

    const approachInput = MQ.MathField(document.getElementById('approach-input'), {
        spaceBehavesLikeTab: true,
        handlers: {
            edit: function() {}
        }
    });

    const resultField = MQ.StaticMath(document.getElementById('result'));
    const stepsField = document.getElementById('steps');

    // Set default values
    functionInput.latex('\\frac{x^2 - 4}{x - 2}');
    approachInput.latex('2');

    document.getElementById('calculate').addEventListener('click', function() {
        try {
            const latexFn = functionInput.latex();
            const latexApproach = approachInput.latex();
            
            // Convert LaTeX to math expression
            const mathExpr = latexToMath(latexFn);
            const approachValue = parseLatexNumber(latexApproach);
            
            // Calculate limit
            const { value, steps } = calculateLimit(mathExpr, approachValue);
            
            // Display results
            if (value !== undefined) {
                resultField.latex(`\\lim_{x \\to ${approachValue}} ${latexFn} = ${formatResult(value)}`);
                stepsField.innerHTML = steps;
            } else {
                resultField.latex(`\\lim_{x \\to ${approachValue}} ${latexFn} \\text{ does not exist}`);
                stepsField.innerHTML = `<p>Limit does not exist or could not be determined</p>`;
            }
        } catch (error) {
            resultField.latex('\\text{Error in calculation}');
            stepsField.innerHTML = `<p>Error: ${error.message}</p>`;
            console.error(error);
        }
    });

    function parseLatexNumber(latex) {
        // Handle simple numbers and fractions
        if (/^-?\d+$/.test(latex)) return parseFloat(latex);
        
        // Handle fractions like \frac{num}{denom}
        const fracMatch = latex.match(/^\\frac\{(-?\d+)\}\{(-?\d+)\}$/);
        if (fracMatch) {
            return parseFloat(fracMatch[1]) / parseFloat(fracMatch[2]);
        }
        
        // Handle pi expressions like \pi or -\pi
        if (latex === '\\pi') return Math.PI;
        if (latex === '-\\pi') return -Math.PI;
        
        // Default case
        return parseFloat(latex) || 0;
    }

    function latexToMath(latex) {
        return latex
            .replace(/\\frac{(.*?)}{(.*?)}/g, '($1)/($2)')
            .replace(/\\sqrt{(.*?)}/g, 'sqrt($1)')
            .replace(/\\left|\\right/g, '')
            .replace(/\\sin/g, 'sin')
            .replace(/\\cos/g, 'cos')
            .replace(/\\tan/g, 'tan')
            .replace(/\\ln/g, 'log')
            .replace(/\\log/g, 'log10')
            .replace(/\\exp/g, 'exp')
            .replace(/\\pi/g, 'pi')
            .replace(/\^\{([^}]+)\}/g, '^($1)')
            .replace(/\s/g, '');
    }

    function calculateLimit(expr, x) {
        let steps = [];
        
        // Step 1: Try direct substitution
        const direct = tryDirectSubstitution(expr, x);
        steps.push(`<p><b>Step 1: Direct Substitution</b><br>Trying to substitute x = ${x}: ${expr.replace(/x/g, `(${x})`)}</p>`);
        
        if (direct !== undefined && !isNaN(direct)) {
            steps.push(`<p>Direct substitution works: Result = ${direct}</p>`);
            return { value: direct, steps: steps.join('') };
        }
        
        // Step 2: Try algebraic simplification
        const simplified = tryAlgebraicSimplification(expr, x);
        steps.push(`<p><b>Step 2: Algebraic Simplification</b><br>Trying to simplify the expression</p>`);
        
        if (simplified !== undefined) {
            const simplifiedValue = tryDirectSubstitution(simplified, x);
            if (simplifiedValue !== undefined) {
                steps.push(`<p>Simplified to: ${simplified}<br>Now substituting x = ${x}: ${simplifiedValue}</p>`);
                return { value: simplifiedValue, steps: steps.join('') };
            }
        }
        
        // Step 3: Try L'Hôpital's Rule
        steps.push(`<p><b>Step 3: L'Hôpital's Rule</b><br>Checking for indeterminate form (0/0 or ∞/∞)</p>`);
        const lh = tryLHopital(expr, x, steps);
        if (lh !== undefined) {
            return { value: lh, steps: steps.join('') };
        }
        
        // Step 4: Try numerical approach
        steps.push(`<p><b>Step 4: Numerical Approach</b><br>Evaluating function near x = ${x}</p>`);
        const numerical = tryNumericalApproach(expr, x, steps);
        if (numerical !== undefined) {
            return { value: numerical, steps: steps.join('') };
        }
        
        return { value: undefined, steps: steps.join('') };
    }

    function tryDirectSubstitution(expr, x) {
        try {
            const substituted = expr.replace(/x/g, `(${x})`);
            const parsed = math.parse(substituted);
            const value = parsed.evaluate();
            
            if (isNaN(value) || !isFinite(value)) return undefined;
            return value;
        } catch (e) {
            return undefined;
        }
    }

    function tryAlgebraicSimplification(expr, x) {
        try {
            // Example: (x^2-4)/(x-2) simplifies to x+2
            if (expr.match(/\(x\^2\s*-\s*\d+\)\s*\/\s*\(x\s*-\s*\d+\)/)) {
                const numerator = expr.match(/\(x\^2\s*-\s*(\d+)\)/)[1];
                const denominator = expr.match(/\(x\s*-\s*(\d+)\)/)[1];
                const a = Math.sqrt(parseInt(numerator));
                if (a.toString() === denominator) {
                    return `x + ${a}`;
                }
            }
            
            // Example: (x^2-9)/(x-3) simplifies to x+3
            if (expr.match(/\(x\^2\s*-\s*9\)\s*\/\s*\(x\s*-\s*3\)/)) {
                return 'x + 3';
            }
            
            // Add more simplification patterns as needed
            return undefined;
        } catch (e) {
            return undefined;
        }
    }

    function tryLHopital(expr, x, steps) {
        try {
            if (!expr.includes('/')) return undefined;

            const [numerator, denominator] = expr.split('/').map(part => `(${part})`);
            const scope = { x };

            const numVal = math.evaluate(numerator, scope);
            const denVal = math.evaluate(denominator, scope);

            // Check for 0/0 or ∞/∞
            const isIndeterminate = 
                (Math.abs(numVal) < 1e-6 && Math.abs(denVal) < 1e-6) ||
                (Math.abs(numVal) > 1e6 && Math.abs(denVal) > 1e6);

            if (!isIndeterminate) return undefined;

            steps.push(`<p>Found indeterminate form: ${numVal}/${denVal}</p>`);
            steps.push(`<p>Applying L'Hôpital's Rule (taking derivatives of numerator and denominator)</p>`);

            const numDeriv = math.derivative(numerator, 'x').toString();
            const denDeriv = math.derivative(denominator, 'x').toString();

            steps.push(`<p>Numerator derivative: ${numDeriv}<br>Denominator derivative: ${denDeriv}</p>`);

            const numPrime = math.evaluate(numDeriv, scope);
            const denPrime = math.evaluate(denDeriv, scope);

            if (Math.abs(denPrime) > 1e-8) {
                const result = numPrime / denPrime;
                steps.push(`<p>After applying L'Hôpital's Rule: ${numPrime}/${denPrime} = ${result}</p>`);
                return result;
            }

            // If still indeterminate, try second derivative
            if (Math.abs(numPrime) < 1e-6 && Math.abs(denPrime) < 1e-6) {
                steps.push(`<p>Still indeterminate, trying second derivative</p>`);
                
                const numSecondDeriv = math.derivative(numDeriv, 'x').toString();
                const denSecondDeriv = math.derivative(denDeriv, 'x').toString();
                
                steps.push(`<p>Numerator second derivative: ${numSecondDeriv}<br>Denominator second derivative: ${denSecondDeriv}</p>`);
                
                const numSecondPrime = math.evaluate(numSecondDeriv, scope);
                const denSecondPrime = math.evaluate(denSecondDeriv, scope);
                
                if (Math.abs(denSecondPrime) > 1e-8) {
                    const result = numSecondPrime / denSecondPrime;
                    steps.push(`<p>After second application of L'Hôpital's Rule: ${numSecondPrime}/${denSecondPrime} = ${result}</p>`);
                    return result;
                }
            }

            return undefined;
        } catch (e) {
            steps.push(`<p>Error applying L'Hôpital's Rule: ${e.message}</p>`);
            return undefined;
        }
    }

    function tryNumericalApproach(expr, x, steps) {
        try {
            // Try values approaching from left and right
            const h = 1e-6;
            const leftApproach = x - h;
            const rightApproach = x + h;
            
            const leftValue = tryDirectSubstitution(expr, leftApproach);
            const rightValue = tryDirectSubstitution(expr, rightApproach);
            
            steps.push(`<p>Approaching from left (x = ${leftApproach}): ${leftValue}<br>
                        Approaching from right (x = ${rightApproach}): ${rightValue}</p>`);
            
            if (leftValue !== undefined && rightValue !== undefined && 
                Math.abs(leftValue - rightValue) < 1e-6) {
                steps.push(`<p>Both sides approach the same value: ${leftValue}</p>`);
                return leftValue;
            }
            
            return undefined;
        } catch (e) {
            steps.push(`<p>Error in numerical approach: ${e.message}</p>`);
            return undefined;
        }
    }

    function formatResult(value) {
        // Format simple fractions
        const tolerance = 1e-6;
        for (let d = 1; d <= 10; d++) {
            for (let n = -20; n <= 20; n++) {
                if (n !== 0 && Math.abs(value - n/d) < tolerance) {
                    return n === 1 && d === 1 ? '1' : 
                           n === -1 && d === 1 ? '-1' :
                           `\\frac{${n}}{${d}}`;
                }
            }
        }
        
        // Format π multiples
        const piMultiples = value / Math.PI;
        for (let d = 1; d <= 6; d++) {
            for (let n = -6; n <= 6; n++) {
                if (n !== 0 && Math.abs(piMultiples - n/d) < tolerance) {
                    const absN = Math.abs(n);
                    const sign = n < 0 ? '-' : '';
                    return d === 1 ? `${sign}${absN === 1 ? '' : absN}\\pi` :
                           `${sign}\\frac{${absN === 1 ? '' : absN}\\pi}{${d}}`;
                }
            }
        }
        
        // Default decimal format
        return value.toFixed(4).replace(/\.?0+$/, '');
    }
});