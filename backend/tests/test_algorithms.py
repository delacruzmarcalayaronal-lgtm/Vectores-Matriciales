from __future__ import annotations

import pytest

from app.algorithms import run_operation


class TestVectors:
    def test_vector_add(self):
        result = run_operation("vector_add", [[1, 2, 3], [4, 5, 6]], [], {})
        assert result == {"kind": "vector", "value": [5.0, 7.0, 9.0]}

    def test_vector_add_dimension_mismatch(self):
        with pytest.raises(ValueError, match="misma dimensión"):
            run_operation("vector_add", [[1, 2, 3], [4, 5]], [], {})

    def test_vector_add_requires_two(self):
        with pytest.raises(ValueError, match="exactamente 2"):
            run_operation("vector_add", [[1, 2]], [], {})

    def test_vector_subtract(self):
        result = run_operation("vector_subtract", [[10, 8], [4, 5]], [], {})
        assert result["value"] == [6.0, 3.0]

    def test_vector_scalar_multiply(self):
        result = run_operation("vector_scalar_multiply", [[2, 4, 6]], [], {"scalar": 3})
        assert result == {"kind": "vector", "value": [6.0, 12.0, 18.0]}

    def test_vector_scalar_negative(self):
        result = run_operation("vector_scalar_multiply", [[1, -2]], [], {"scalar": -2})
        assert result["value"] == [-2.0, 4.0]

    def test_scalar_missing(self):
        with pytest.raises(ValueError, match="'scalar'"):
            run_operation("vector_scalar_multiply", [[1, 2]], [], {})

    def test_scalar_not_number(self):
        with pytest.raises(ValueError, match="debe ser un número"):
            run_operation("vector_scalar_multiply", [[1, 2]], [], {"scalar": "abc"})

    def test_vector_dot_product(self):
        result = run_operation("vector_dot_product", [[1, 2, 3], [4, 5, 6]], [], {})
        assert result == {"kind": "scalar", "value": 32.0}

    def test_vector_empty_rejected(self):
        with pytest.raises(ValueError, match="al menos un valor"):
            run_operation("vector_add", [[], []], [], {})


class TestMatrices:
    def test_matrix_add(self):
        result = run_operation(
            "matrix_add", [], [[[1, 2], [3, 4]], [[10, 20], [30, 40]]], {}
        )
        assert result["value"] == [[11.0, 22.0], [33.0, 44.0]]

    def test_matrix_subtract(self):
        result = run_operation(
            "matrix_subtract", [], [[[10, 20], [30, 40]], [[1, 2], [3, 4]]], {}
        )
        assert result["value"] == [[9.0, 18.0], [27.0, 36.0]]

    def test_matrix_shape_mismatch(self):
        with pytest.raises(ValueError, match="mismas dimensiones"):
            run_operation("matrix_add", [], [[[1, 2]], [[1, 2], [3, 4]]], {})

    def test_matrix_multiply(self):
        result = run_operation(
            "matrix_multiply", [], [[[1, 2], [3, 4]], [[5, 6], [7, 8]]], {}
        )
        assert result["value"] == [[19.0, 22.0], [43.0, 50.0]]

    def test_matrix_multiply_incompatible(self):
        with pytest.raises(ValueError, match="columnas de la primera matriz"):
            run_operation("matrix_multiply", [], [[[1, 2, 3]], [[1, 2]]], {})

    def test_matrix_transpose(self):
        result = run_operation("matrix_transpose", [], [[[1, 2, 3], [4, 5, 6]]], {})
        assert result["value"] == [[1.0, 4.0], [2.0, 5.0], [3.0, 6.0]]

    def test_matrix_scalar_multiply(self):
        result = run_operation(
            "matrix_scalar_multiply", [], [[[1, 2], [3, 4]]], {"scalar": 2}
        )
        assert result["value"] == [[2.0, 4.0], [6.0, 8.0]]

    def test_matrix_not_2d_rejected(self):
        with pytest.raises(ValueError, match="matriz no vacía"):
            run_operation("matrix_transpose", [], [[1, 2, 3]], {})


class TestLinearCombination:
    def test_with_weight_list(self):
        result = run_operation(
            "linear_combination",
            [[1, 2], [3, 4]],
            [],
            {"weights": [2, 0.5]},
        )
        assert result == {"kind": "vector", "value": [3.5, 6.0]}

    def test_with_weights_by_vector_id(self):
        result = run_operation(
            "linear_combination",
            [[1, 1], [2, 2]],
            [],
            {"weights": {"v1": 3, "v2": 1}, "vectorIds": ["v1", "v2"]},
        )
        assert result["value"] == [5.0, 5.0]

    def test_default_weights_are_one(self):
        result = run_operation("linear_combination", [[1, 2], [10, 20]], [], {})
        assert result["value"] == [11.0, 22.0]

    def test_dimension_mismatch(self):
        with pytest.raises(ValueError, match="misma dimensión"):
            run_operation("linear_combination", [[1, 2], [1, 2, 3]], [], {})

    def test_requires_at_least_one_vector(self):
        with pytest.raises(ValueError, match="al menos 1 vector"):
            run_operation("linear_combination", [], [], {})


class TestErrors:
    def test_unsupported_type(self):
        with pytest.raises(ValueError, match="no soportado"):
            run_operation("vector_divide", [[1], [2]], [], {})

    def test_bad_vector_count_on_dot(self):
        with pytest.raises(ValueError, match="exactamente 2"):
            run_operation("vector_dot_product", [[1, 2]], [], {})

    def test_bad_matrix_count(self):
        with pytest.raises(ValueError, match="exactamente 2 matrices"):
            run_operation("matrix_add", [], [[[1]]], {})
