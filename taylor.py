import math
import numpy as np
import matplotlib.pyplot as plt

# TAYLOR SERIES FUNCTIONS
MIN_ERROR = 0.005
MAX_TERMS = 85

def comb(a, i):
    """Manual combination function for older Python versions."""
    if i < 0:
        return 0
    res = 1
    for j in range(1, i + 1):
        res *= (a - j + 1) / j
    return res

def taylor_approx(x, function, a):
    for i in range(1, MAX_TERMS + 1):
        if function == 'exp':
            approx = func_exp(x, i)
            actual = math.exp(x)
        elif function == 'cos':
            approx = func_cos(x, i)
            actual = np.cos(x)
        elif function == 'binom':
            approx = func_binom(x, a, i)
            actual = (1 + x) ** a
        elif function == 'ln':
            approx = func_ln(x, a, i)
            actual = np.log(x)
        error = abs(approx - actual)
        if error < MIN_ERROR or i == MAX_TERMS:
            terms = i
            break
    return terms, approx, actual, error

# APPROXIMATION FUNCTIONS
def func_exp(x, n):
    exp_approx = 0
    for i in range(n):
        num = x**i / math.factorial(i)
        exp_approx += num
    return exp_approx

def func_cos(x, n):
    cos_approx = 0
    for i in range(n):
        coef = (-1)**i
        num = x**(2*i)
        denom = math.factorial(2*i)
        cos_approx += coef * (num / denom)
    return cos_approx

def func_binom(x, a, n):
    binom_approx = 0
    for i in range(n):
        coef = comb(a, i)  # Using manual comb() to avoid version issues
        num = x**i
        binom_approx += coef * num
    return binom_approx

def func_ln(x, a, n):
    ln_approx = np.log(a)
    for i in range(1, n):
        term = ((-1)**(i+1)) * ((x - a)**i) / (i * (a**i))
        ln_approx += term
    return ln_approx

def main():
    functions = ['exp', 'cos', 'binom', 'ln']
    colors = ['red', 'green', 'blue', 'orange']
    labels = ['exp(x)', 'cos(x)', '(1+x)^a', 'ln(x)']
    order = 5  # Up to 5th order
    a = 1.0    # Expansion point for binom and ln

    step = 0.1
    x_bounds = {'low': -10, 'high': 10}  # was -2 to 2
    y_bounds = {'low': -10, 'high': 50}  # adjust for better visibility


    x = np.arange(x_bounds['low'], x_bounds['high'], step, dtype=np.float64)

    fig, ax = plt.subplots()

    for idx, function in enumerate(functions):
        y_approx = np.zeros_like(x)
        y_actual = np.zeros_like(x)

        for i, val in enumerate(x):
            if function == 'exp':
                y_approx[i] = func_exp(val, order)
                y_actual[i] = math.exp(val)
            elif function == 'cos':
                y_approx[i] = func_cos(val, order)
                y_actual[i] = np.cos(val)
            elif function == 'binom':
                y_approx[i] = func_binom(val, a, order)
                y_actual[i] = (1 + val) ** a
            elif function == 'ln':
                if val > 0:
                    y_approx[i] = func_ln(val, a, order)
                    y_actual[i] = np.log(val)
                else:
                    y_approx[i] = np.nan
                    y_actual[i] = np.nan

        ax.plot(x, y_approx, color=colors[idx], label=f'Taylor {labels[idx]} (order {order})')
        ax.plot(x, y_actual, color=colors[idx], linestyle='dashed', label=f'Actual {labels[idx]}')

    ax.set_xlim([x_bounds['low'], x_bounds['high']])
    ax.set_ylim([y_bounds['low'], y_bounds['high']])
    ax.legend()
    ax.set_title('Taylor Approximations (Order 5)')
    ax.grid(True)
    ax.axes.set_xlabel('x')
    ax.axes.set_ylabel('y')
    ax.axhline(0, color='black', lw=1.5)
    ax.axvline(0, color='black', lw=1.5)
    plt.show()

if __name__ == "__main__":
    main()