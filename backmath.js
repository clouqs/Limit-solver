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
            const approachValue = parseFloat(latexApproach);
            
            // Calculate limit
            const limitValue = calculateLimit(mathExpr, approachValue);
            
            // Display results
            if (limitValue !== undefined) {
                resultField.latex(`\\lim_{x \\to ${approachValue}} ${latexFn} = ${formatResult(limitValue)}`);
                stepsField.innerHTML = `<p>Limit exists and equals ${limitValue}</p>`;
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

    function latexToMath(latex) {
        // Simple conversion - this needs to be more robust for production
        return latex
            .replace(/\\frac{(.*?)}{(.*?)}/g, '($1)/($2)')
            .replace(/\\sqrt{(.*?)}/g, 'sqrt($1)')
            .replace(/\\left|\\right/g, '')
            .replace(/\s/g, '')
            .replace(/\^\{([^}]+)\}/g, '^($1)')
            .replace(/e\^\{([^}]+)\}/g, 'exp($1)');
    }

    function calculateLimit(expr, x) {
        // Try direct substitution first
        const directValue = tryDirectSubstitution(expr, x);
        if (directValue !== undefined) return directValue;
        
        // Try algebraic simplification
        const simplifiedValue = tryAlgebraicSimplification(expr, x);
        if (simplifiedValue !== undefined) return simplifiedValue;
        
        // Try L'Hôpital's rule for indeterminate forms
        const lhopitalValue = tryLHopital(expr, x);
        if (lhopitalValue !== undefined) return lhopitalValue;
        
        // Couldn't determine limit
        return undefined;
    }

    function tryDirectSubstitution(expr, x) {
        try {
            const substituted = expr.replace(/x/g, `(${x})`);
            const parsed = math.parse(substituted);
            const value = parsed.evaluate();
            
            if (isNaN(value)) return undefined;
            return value;
        } catch (e) {
            return undefined;
        }
    }

    function tryAlgebraicSimplification(expr, x) {
        try {
            // Example: (x^2-4)/(x-2) simplifies to x+2
            if (expr === '(x^2-4)/(x-2)') {
                return x + 2;
            }
            // Add more simplification rules as needed
            return undefined;
        } catch (e) {
            return undefined;
        }
    }

    function tryLHopital(expr, x) {
        try {
            // Very basic implementation for 0/0 cases
            if (expr.includes('/')) {
                const [num, den] = expr.split('/');
                const numVal = tryDirectSubstitution(num, x);
                const denVal = tryDirectSubstitution(den, x);
                
                if (Math.abs(numVal) < 1e-6 && Math.abs(denVal) < 1e-6) {
                    // Numerical derivatives
                    const h = 0.0001;
                    const numPrime = (tryDirectSubstitution(num, x+h) - tryDirectSubstitution(num, x-h))/(2*h);
                    const denPrime = (tryDirectSubstitution(den, x+h) - tryDirectSubstitution(den, x-h))/(2*h);
                    
                    if (Math.abs(denPrime) > 1e-6) {
                        return numPrime / denPrime;
                    }
                }
            }
            return undefined;
        } catch (e) {
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