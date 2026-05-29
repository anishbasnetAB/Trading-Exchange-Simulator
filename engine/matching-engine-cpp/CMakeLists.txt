cmake_minimum_required(VERSION 3.20)
project(MatchingEngine VERSION 1.0.0)

# Use C++20
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Compiler warnings — treat your code seriously
add_compile_options(-Wall -Wextra -Wpedantic)

# Release build optimizations
if(CMAKE_BUILD_TYPE STREQUAL "Release")
  add_compile_options(-O2)
endif()

# ── Main engine library ────────────────────────────────────
# We build the engine as a library so tests can link against it
add_library(engine_lib
  src/Order.cpp
  src/OrderBook.cpp
  src/MatchingEngine.cpp
)

target_include_directories(engine_lib PUBLIC include)

# ── Main executable ────────────────────────────────────────
add_executable(engine src/main.cpp)
target_link_libraries(engine PRIVATE engine_lib)

# ── Tests ─────────────────────────────────────────────────
include(FetchContent)
FetchContent_Declare(
  googletest
  DOWNLOAD_EXTRACT_TIMESTAMP TRUE
  URL https://github.com/google/googletest/archive/v1.14.0.zip
)
FetchContent_MakeAvailable(googletest)

enable_testing()

if(EXISTS ${CMAKE_SOURCE_DIR}/tests/OrderBookTest.cpp)
  add_executable(engine_tests
    tests/OrderBookTest.cpp
    tests/MatchingEngineTest.cpp
  )
  target_link_libraries(engine_tests PRIVATE engine_lib GTest::gtest_main)
  include(GoogleTest)
  gtest_discover_tests(engine_tests)
endif()