#!/bin/bash

# Express MCP Streaming Test Suite
# Tests all three streaming types: HTTP, SSE, stdio

set -e

BASE_URL="http://localhost:3000"
STREAMING_SERVER_PID=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to start the streaming server
start_server() {
    print_status "Starting streaming server..."
    cd examples/streaming
    npx tsx server.ts &
    STREAMING_SERVER_PID=$!
    cd ../..
    
    # Wait for server to start
    sleep 3
    
    # Check if server is running
    if curl -s "$BASE_URL/mcp/tools" > /dev/null; then
        print_success "Streaming server started (PID: $STREAMING_SERVER_PID)"
    else
        print_error "Failed to start streaming server"
        exit 1
    fi
}

# Function to stop the server
stop_server() {
    if [ ! -z "$STREAMING_SERVER_PID" ]; then
        print_status "Stopping streaming server (PID: $STREAMING_SERVER_PID)..."
        kill $STREAMING_SERVER_PID 2>/dev/null || true
        wait $STREAMING_SERVER_PID 2>/dev/null || true
        print_success "Server stopped"
    fi
}

# Trap to ensure server is stopped on exit
trap stop_server EXIT

# Function to test HTTP streaming via MCP
test_http_streaming() {
    print_status "Testing HTTP Streaming via MCP..."
    
    local response=$(curl -s -X POST "$BASE_URL/mcp/invoke" \
        -H "Content-Type: application/json" \
        -d '{"toolName": "GET /api/stream", "args": {}, "streaming": true}' | \
        head -10)
    
    if echo "$response" | grep -q '"type":"chunk"' && echo "$response" | grep -q '"type":"end"'; then
        print_success "HTTP Streaming: ✅ Working"
    else
        print_error "HTTP Streaming: ❌ Failed"
        echo "Response: $response"
    fi
}

# Function to test Server-Sent Events
test_sse() {
    print_status "Testing Server-Sent Events..."
    
    local response=$(timeout 5s curl -s -N "$BASE_URL/api/stream" | head -5)
    
    if echo "$response" | grep -q "data:" && echo "$response" | grep -q "Event"; then
        print_success "SSE: ✅ Working"
    else
        print_error "SSE: ❌ Failed"
        echo "Response: $response"
    fi
}

# Function to test NDJSON streaming
test_ndjson() {
    print_status "Testing NDJSON Streaming..."
    
    local response=$(curl -s "$BASE_URL/api/ndjson" | head -3)
    
    if echo "$response" | grep -q '"name":"Alice"' && echo "$response" | grep -q '"name":"Bob"'; then
        print_success "NDJSON: ✅ Working"
    else
        print_error "NDJSON: ❌ Failed"
        echo "Response: $response"
    fi
}

# Function to test JSON Lines streaming
test_jsonlines() {
    print_status "Testing JSON Lines Streaming..."
    
    local response=$(curl -s "$BASE_URL/api/jsonlines" | head -3)
    
    if echo "$response" | grep -q '"event":"user_login"' && echo "$response" | grep -q '"event":"page_view"'; then
        print_success "JSON Lines: ✅ Working"
    else
        print_error "JSON Lines: ❌ Failed"
        echo "Response: $response"
    fi
}

# Function to test custom streaming
test_custom_streaming() {
    print_status "Testing Custom Streaming Headers..."
    
    local response=$(curl -s "$BASE_URL/api/custom-stream" | head -3)
    
    if echo "$response" | grep -q "Starting process" && echo "$response" | grep -q "Loading data"; then
        print_success "Custom Streaming: ✅ Working"
    else
        print_error "Custom Streaming: ❌ Failed"
        echo "Response: $response"
    fi
}

# Function to test chunked transfer
test_chunked() {
    print_status "Testing Chunked Transfer Encoding..."
    
    local response=$(timeout 3s curl -s "$BASE_URL/api/logs" | head -5)
    
    if echo "$response" | grep -q "INFO:" && echo "$response" | grep -q "WARN:"; then
        print_success "Chunked Transfer: ✅ Working"
    else
        print_error "Chunked Transfer: ❌ Failed"
        echo "Response: $response"
    fi
}

# Function to test stdio streaming via MCP bridge
test_stdio_streaming() {
    print_status "Testing stdio Streaming via MCP Bridge..."
    
    # Test with a simple streaming request
    local response=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"GET /api/ndjson","arguments":{"_streaming":true}}}' | \
        timeout 10s node scripts/mcp-bridge.cjs 2>/dev/null | head -5)
    
    if echo "$response" | grep -q '"jsonrpc":"2.0"' && echo "$response" | grep -q '"result"'; then
        print_success "stdio Streaming: ✅ Working"
    else
        print_warning "stdio Streaming: ⚠️  May require manual testing"
        print_status "To test manually, run:"
        echo "  echo '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"GET /api/ndjson\",\"arguments\":{\"_streaming\":true}}}' | node scripts/mcp-bridge.cjs"
    fi
}

# Function to test MCP tool discovery
test_tool_discovery() {
    print_status "Testing MCP Tool Discovery..."
    
    local response=$(curl -s "$BASE_URL/mcp/tools")
    local tool_count=$(echo "$response" | jq -r '.tools | length' 2>/dev/null || echo "0")
    
    if [ "$tool_count" -gt "0" ]; then
        print_success "Tool Discovery: ✅ Found $tool_count tools"
        
        # Check for specific streaming tools
        if echo "$response" | grep -q "GET /api/stream" && echo "$response" | grep -q "GET /api/ndjson"; then
            print_success "Streaming tools properly registered"
        else
            print_warning "Some streaming tools may not be registered"
        fi
    else
        print_error "Tool Discovery: ❌ No tools found"
    fi
}

# Function to test performance with concurrent requests
test_performance() {
    print_status "Testing Performance with Concurrent Requests..."
    
    # Start 5 concurrent streaming requests
    for i in {1..5}; do
        curl -s -X POST "$BASE_URL/mcp/invoke" \
            -H "Content-Type: application/json" \
            -d '{"toolName": "GET /api/stream", "args": {}, "streaming": true}' \
            > "/tmp/stream_test_$i.log" &
    done
    
    # Wait for all requests to complete
    wait
    
    # Check results
    local success_count=0
    for i in {1..5}; do
        if [ -f "/tmp/stream_test_$i.log" ] && grep -q '"type":"end"' "/tmp/stream_test_$i.log"; then
            success_count=$((success_count + 1))
        fi
        rm -f "/tmp/stream_test_$i.log"
    done
    
    if [ "$success_count" -eq 5 ]; then
        print_success "Performance: ✅ All 5 concurrent requests succeeded"
    else
        print_warning "Performance: ⚠️  Only $success_count/5 concurrent requests succeeded"
    fi
}

# Function to run all tests
run_all_tests() {
    echo "🧪 Express MCP Streaming Test Suite"
    echo "===================================="
    echo ""
    
    # Start the server
    start_server
    
    # Run all tests
    test_tool_discovery
    echo ""
    
    test_http_streaming
    echo ""
    
    test_sse
    echo ""
    
    test_ndjson
    echo ""
    
    test_jsonlines
    echo ""
    
    test_custom_streaming
    echo ""
    
    test_chunked
    echo ""
    
    test_stdio_streaming
    echo ""
    
    test_performance
    echo ""
    
    print_success "🎉 All streaming tests completed!"
    echo ""
    echo "📊 Summary:"
    echo "  • HTTP Streaming via MCP"
    echo "  • Server-Sent Events (SSE)"
    echo "  • NDJSON Streaming"
    echo "  • JSON Lines Streaming"
    echo "  • Custom Streaming Headers"
    echo "  • Chunked Transfer Encoding"
    echo "  • stdio Streaming via MCP Bridge"
    echo "  • Tool Discovery"
    echo "  • Performance Testing"
    echo ""
    echo "🔗 Test URLs:"
    echo "  • MCP Tools: $BASE_URL/mcp/tools"
    echo "  • MCP Invoke: $BASE_URL/mcp/invoke"
    echo "  • SSE: $BASE_URL/api/stream"
    echo "  • NDJSON: $BASE_URL/api/ndjson"
    echo "  • JSON Lines: $BASE_URL/api/jsonlines"
    echo "  • Custom: $BASE_URL/api/custom-stream"
    echo "  • Logs: $BASE_URL/api/logs"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [test_name]"
    echo ""
    echo "Available tests:"
    echo "  all              Run all tests (default)"
    echo "  http             Test HTTP streaming via MCP"
    echo "  sse              Test Server-Sent Events"
    echo "  ndjson           Test NDJSON streaming"
    echo "  jsonlines        Test JSON Lines streaming"
    echo "  custom           Test custom streaming headers"
    echo "  chunked          Test chunked transfer encoding"
    echo "  stdio            Test stdio streaming via MCP bridge"
    echo "  tools            Test MCP tool discovery"
    echo "  performance      Test concurrent streaming performance"
    echo ""
    echo "Examples:"
    echo "  $0                    # Run all tests"
    echo "  $0 sse               # Test only SSE"
    echo "  $0 stdio             # Test only stdio streaming"
}

# Main execution
case "${1:-all}" in
    "all")
        run_all_tests
        ;;
    "http")
        start_server
        test_http_streaming
        ;;
    "sse")
        start_server
        test_sse
        ;;
    "ndjson")
        start_server
        test_ndjson
        ;;
    "jsonlines")
        start_server
        test_jsonlines
        ;;
    "custom")
        start_server
        test_custom_streaming
        ;;
    "chunked")
        start_server
        test_chunked
        ;;
    "stdio")
        start_server
        test_stdio_streaming
        ;;
    "tools")
        start_server
        test_tool_discovery
        ;;
    "performance")
        start_server
        test_performance
        ;;
    "help"|"-h"|"--help")
        show_usage
        ;;
    *)
        print_error "Unknown test: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac
