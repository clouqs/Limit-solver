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
            // Show loading indicator
            resultField.latex('');
            stepsField.innerHTML = '<div class="loading"></div> Calculating...';

            const fn = functionInput.latex();
            const approach = approachInput.latex();

            // Convert LaTeX to plain math expression
            const mathExpr = latexToMath(fn);
            const approachValue = parseFloat(approach);

            // Try direct substitution first
            let result = tryDirectSubstitution(mathExpr, approachValue);

            if (result === undefined || isNaN(result)) {
                // If direct substitution fails, try algebraic manipulation
                result = tryAlgebraicSimplification(mathExpr, approachValue);
            }

            if (result === undefined || isNaN(result)) {
                // If still fails, try L'Hôpital's Rule
                result = tryLHopital(mathExpr, approachValue);
            }

            if (result !== undefined && !isNaN(result)) {
                resultField.latex(`\\lim_{x \\to ${approach}} \\left( ${fn} \\right) = ${formatResult(result)}`);
                stepsField.innerHTML = "";
            } else {
                resultField.latex(`\\text{Could not compute } \\lim_{x \\to ${approach}} \\left( ${fn} \\right)`);
                stepsField.innerHTML = '<em>Limit may not exist or requires more advanced techniques</em>';
            }
        } catch (error) {
            resultField.latex('\\text{Error: Could not compute limit}');
            stepsField.innerHTML = `<em>Error: ${error.message}</em>`;
            console.error(error);
        }
    });

    function latexToMath(latex) {
        // Simple LaTeX to math expression conversion
        return latex
            .replace(/\\frac{(.*?)}{(.*?)}/g, '($1)/($2)')
            .replace(/\\sqrt{(.*?)}/g, 'sqrt($1)')
            .replace(/\\sin/g, 'sin')
            .replace(/\\cos/g, 'cos')
            .replace(/\\tan/g, 'tan')
            .replace(/\\ln/g, 'ln')
            .replace(/\\log/g, 'log')
            .replace(/\^{(\d+)}/g, '^$1')
            .replace(/\s/g, '')
            .replace(/e\^\{(.+?)\}/g, 'exp($1)');     // e^{...} → exp(...)
            .replace(/e\^([a-zA-Z0-9\+\-\*/\(\)]+)/g, 'exp($1)'); // e^... → exp(...)
    }

    function tryDirectSubstitution(expr, x) {
        try {
            // Replace all x's with the approach value
            const substituted = expr.replace(/x/g, `(${x})`);
            const parsed = math.parse(substituted);
            const value = parsed.evaluate();

            // Check for indeterminate forms
            if (!isFinite(value)) {
                return undefined;
            }

            return value;
        } catch (e) {
            return undefined;
        }
    }

    function tryAlgebraicSimplification(expr, x) {
        try {
            // Use algebra.js to simplify expressions
            const exprObj = algebra.parse(expr);

            // Try to simplify (e.g., factor polynomials)
            const simplified = math.simplify(expr);

            // Try direct substitution again
            const subExpr = simplified.toString().replace(/x/g, `(${x})`);
            const parsed = math.parse(subExpr);
            const value = parsed.evaluate();

            if (isFinite(value)) {
                return value;
            }

            return undefined;
        } catch (e) {
            return undefined;
        }
    }

    function tryLHopital(expr, x) {
        try {
            // Very basic L'Hôpital's Rule implementation for 0/0 cases
            if (expr.includes('/')) {
                const [numerator, denominator] = expr.split('/');

                // Check if both approach 0
                const numAtX = tryDirectSubstitution(numerator, x);
                const denomAtX = tryDirectSubstitution(denominator, x);

                if (Math.abs(numAtX) < 1e-10 && Math.abs(denomAtX) < 1e-10) {
                    // Very simple derivative approximation (h=0.0001)
                    const h = 0.0001;
                    const fPrime = (tryDirectSubstitution(numerator, x + h) - tryDirectSubstitution(numerator, x - h)) / (2 * h);
                    const gPrime = (tryDirectSubstitution(denominator, x + h) - tryDirectSubstitution(denominator, x - h)) / (2 * h);

                    if (Math.abs(gPrime) > 1e-10) {
                        return fPrime / gPrime;
                    }
                }
            }
            return undefined;
        } catch (e) {
            return undefined;
        }
    }

    function formatResult(value) {
        // Format simple fractions nicely
        if (Math.abs(value - Math.round(value)) < 1e-10) {
            return Math.round(value);
        }

        // Try to find simple fractions
        for (let denom = 2; denom <= 10; denom++) {
            for (let num = 1; num < denom; num++) {
                if (Math.abs(value - num / denom) < 1e-6) {
                    return `\\frac{${num}}{${denom}}`;
                }
                if (Math.abs(value + num / denom) < 1e-6) {
                    return `-\\frac{${num}}{${denom}}`;
                }
            }
        }

        // Default to decimal with 4 significant digits
        return value.toPrecision(4);
    }
});