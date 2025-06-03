document.addEventListener('DOMContentLoaded', function() {
    // Load required libraries
    if (typeof MQ === 'undefined') {
        console.error('MathQuill not loaded');
        return;
    }
    
    if (typeof math === 'undefined') {
        console.error('Math.js not loaded');
        return;
    }

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
            
            const mathExpr = latexToMath(latexFn);
            const approachValue = parseLatexNumber(latexApproach);
            
            const { value, steps } = calculateLimit(mathExpr, approachValue);
            
            // Display results
            if (value !== undefined) {
                const approachDisplay = approachValue === Infinity ? '\\infty' : 
                                      approachValue === -Infinity ? '-\\infty' : approachValue;
                resultField.latex(`\\lim_{x \\to ${approachDisplay}} ${latexFn} = ${formatResult(value)}`);
                stepsField.innerHTML = steps;
            } else {
                const approachDisplay = approachValue === Infinity ? '\\infty' : 
                                      approachValue === -Infinity ? '-\\infty' : approachValue;
                resultField.latex(`\\lim_{x \\to ${approachDisplay}} ${latexFn} \\text{ does not exist}`);
                stepsField.innerHTML = `<p>Limit does not exist or could not be determined</p>`;
            }
        } catch (error) {
            resultField.latex('\\text{Error in calculation}');
            stepsField.innerHTML = `<p>Error: ${error.message}</p>`;
            console.error(error);
        }
    });

    function parseLatexNumber(latex) {
        // Handle infinity cases
        if (latex === '\\infty') return Infinity;
        if (latex === '-\\infty') return -Infinity;
        
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
            .replace(/\\sqrt\[(\d+)\]{(.*?)}/g, '($2)^(1/$1)')
            .replace(/\\sqrt{(.*?)}/g, 'sqrt($1)')
            .replace(/\\frac{(.*?)}{(.*?)}/g, '($1)/($2)')
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

    function calculateLimit(expr, x, steps = []) {
        // Step 1: Try direct substitution
        const direct = tryDirectSubstitution(expr, x);
        steps.push(`<p><b>Step 1: Direct Substitution</b><br>Trying to substitute x = ${x}: ${expr.replace(/x/g, `(${x})`)}</p>`);
        
        if (direct !== undefined && !isNaN(direct)) {
            steps.push(`<p>Direct substitution works: Result = ${direct}</p>`);
            return { value: direct, steps: steps.join('') };
        }

        if (x === Infinity || x === -Infinity) {
            steps.push(`<p><b>Step 1: Infinity Limit</b><br>Calculating limit as x approaches ${x === Infinity ? '∞' : '-∞'}</p>`);
            const infinityValue = evaluateAtInfinity(expr, x, steps);
            if (infinityValue !== undefined) {
                return { value: infinityValue, steps: steps.join('') };
            }
            return { value: undefined, steps: steps.join('') };
        }
        
        // Step 2: Try algebraic simplification
        steps.push(`<p><b>Step 2: Algebraic Simplification</b><br>Trying to simplify the expression</p>`);
        const simplified = tryAlgebraicSimplification(expr, x);
        
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
        
        // Step 5: Try Taylor series for limits near zero
        if (Math.abs(x) < 1e-6) {
            steps.push(`<p><b>Step 5: Taylor Series Expansion</b><br>Attempting Taylor series near x = 0</p>`);
            const taylorValue = tryTaylorSeries(expr, x, steps);
            if (taylorValue !== undefined) {
                return { value: taylorValue, steps: steps.join('') };
            }
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

            return undefined;
        } catch (e) {
            steps.push(`<p>Error applying L'Hôpital's Rule: ${e.message}</p>`);
            return undefined;
        }
    }

    function tryNumericalApproach(expr, x, steps) {
        try {
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

    function tryTaylorSeries(expr, x, steps) {
        const replacements = {
            'sin(x)': {
                series: 'x - x^3/6 + x^5/120 + o(x^6)',
                approx: '(x - (x^3)/6 + (x^5)/120)'
            },
            'cos(x)': {
                series: '1 - x^2/2 + x^4/24 + o(x^5)',
                approx: '(1 - (x^2)/2 + (x^4)/24)'
            },
            'tan(x)': {
                series: 'x + x^3/3 + 2x^5/15 + o(x^6)',
                approx: '(x + (x^3)/3 + (2*x^5)/15)'
            },
            'exp(x)': {
                series: '1 + x + x^2/2 + x^3/6 + o(x^4)',
                approx: '(1 + x + (x^2)/2 + (x^3)/6)'
            },
            'ln(1+x)': {
                series: 'x - x^2/2 + x^3/3 + o(x^4)',
                approx: '(x - (x^2)/2 + (x^3)/3)'
            }
        };

        for (const [fn, {series, approx}] of Object.entries(replacements)) {
            if (expr.includes(fn)) {
                steps.push(`<p><b>Taylor Series Expansion:</b><br>${fn} ≈ ${series}</p>`);
                const taylorApprox = expr.replace(new RegExp(fn, 'g'), approx);
                steps.push(`<p>Approximated expression: ${taylorApprox}</p>`);
                return tryDirectSubstitution(taylorApprox, x);
            }
        }

        // Special case for sin(x)/x
        if (expr.includes('sin(x)/x')) {
            steps.push(`<p><b>Special Limit:</b> lim<sub>x→0</sub> sin(x)/x = 1</p>`);
            return 1;
        }

        return undefined;
    }

    function evaluateAtInfinity(expr, infinity, steps) {
        try {
            // Strategy: Substitute x with 1/y and take limit as y→0+
            const transformedExpr = expr.replace(/x/g, '(1/y)');
            steps.push(`<p>Substituting x = 1/y to transform to limit as y→0+</p>`);
            
            // Try direct substitution with a very small y
            const y = 1e-10;
            const value = tryDirectSubstitution(transformedExpr, y);
            
            if (value !== undefined) {
                steps.push(`<p>Evaluating at y = ${y}: ${value}</p>`);
                return infinity === Infinity ? value : 
                    (value === 0 ? 0 : -value);
            }
            
            // Polynomial terms: highest degree dominates
            if (expr.includes('x^')) {
                const highestPower = getHighestPower(expr);
                if (highestPower > 0) {
                    steps.push(`<p>Dominant term is x^${highestPower} → ${infinity === Infinity ? '∞' : '-∞'}</p>`);
                    return infinity;
                }
            }
            
            // Rational functions: compare degrees
            if (expr.includes('/')) {
                const [numerator, denominator] = expr.split('/');
                const numDegree = getHighestPower(numerator);
                const denomDegree = getHighestPower(denominator);

                if (numDegree > denomDegree) {
                    steps.push(`<p>Numerator has higher degree → limit is ${infinity === Infinity ? '∞' : '-∞'}</p>`);
                    return infinity;
                } else if (numDegree < denomDegree) {
                    steps.push(`<p>Denominator has higher degree → limit is 0</p>`);
                    return 0;
                } else {
                    steps.push(`<p>Degrees are equal → limit is ratio of leading coefficients</p>`);
                    const numLeadCoeff = getLeadingCoefficient(numerator);
                    const denomLeadCoeff = getLeadingCoefficient(denominator);
                    const ratio = numLeadCoeff / denomLeadCoeff;
                    steps.push(`<p>Leading coefficient ratio: ${numLeadCoeff}/${denomLeadCoeff} = ${ratio}</p>`);
                    return ratio;
                }
            }

            return undefined;
        } catch (e) {
            steps.push(`<p>Error evaluating limit at infinity: ${e.message}</p>`);
            return undefined;
        }
    }

    function getHighestPower(expr) {
        const powerMatches = expr.match(/x\^(\d+)/g);
        if (!powerMatches) {
            return expr.includes('x') ? 1 : 0;
        }
        
        let maxPower = 0;
        powerMatches.forEach(match => {
            const power = parseInt(match.split('^')[1]);
            if (power > maxPower) maxPower = power;
        });
        
        return maxPower;
    }

    function getLeadingCoefficient(expr) {
        const termMatch = expr.match(/(-?\d*)x\^?\d*/);
        if (termMatch) {
            return termMatch[1] === '' ? 1 : 
                   termMatch[1] === '-' ? -1 : parseFloat(termMatch[1]);
        }
        return 1;
    }

    function formatResult(value) {
        if (value === Infinity) return '\\infty';
        if (value === -Infinity) return '-\\infty';
        
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