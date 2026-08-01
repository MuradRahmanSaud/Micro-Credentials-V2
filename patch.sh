#!/bin/bash

# Remove the ternary else branch and closing braces (lines 1887-1960)
sed -i '1887,1960d' src/components/CourseInsightsDashboard.tsx

# Remove the Standard View overlay and the ternary start (lines 1342-1597)
sed -i '1342,1597d' src/components/CourseInsightsDashboard.tsx

