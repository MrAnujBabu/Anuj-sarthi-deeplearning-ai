import "@lovable.dev/ai-gateway";

/* Copyright 2023 Anthropic, PBC.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */
declare namespace ModelContract_cfe0652e9d685783 {
export type paths = Record<string, never>;
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        BetaAdvisorRedactedResultBlock: {
            encrypted_content: string;
            stop_reason?: string | null;
            
            type: "advisor_redacted_result";
        };
        BetaAdvisorRedactedResultBlockParam: {
            encrypted_content: string;
            stop_reason?: string | null;
            
            type: "advisor_redacted_result";
        };
        BetaAdvisorResultBlock: {
            stop_reason?: string | null;
            text: string;
            
            type: "advisor_result";
        };
        BetaAdvisorResultBlockParam: {
            stop_reason?: string | null;
            text: string;
            
            type: "advisor_result";
        };
        BetaAdvisorTool20260301: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            caching?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            max_tokens?: number | null;
            max_uses?: number | null;
            model: ("claude-haiku-5-5" | "claude-sonnet-5-5" | "claude-fable-5-1" | "claude-opus-5-5" | "claude-mythos-5-1" | "claude-sonnet-5" | "claude-fable-5" | "claude-mythos-5" | "claude-opus-5" | "claude-opus-4-8" | "claude-opus-4-7" | "claude-mythos-preview" | "claude-opus-4-6" | "claude-sonnet-4-6" | "claude-haiku-4-5" | "claude-haiku-4-5-20251001" | "claude-opus-4-5" | "claude-opus-4-5-20251101" | "claude-sonnet-4-5" | "claude-sonnet-4-5-20250929") | string;
            
            name: "advisor";
            strict?: boolean | null;
            
            type: "advisor_20260301";
        };
        BetaAdvisorToolResultBlock: {
            content: components["schemas"]["BetaAdvisorToolResultError"] | components["schemas"]["BetaAdvisorResultBlock"] | components["schemas"]["BetaAdvisorRedactedResultBlock"];
            tool_use_id: string;
            
            type: "advisor_tool_result";
        };
        BetaAdvisorToolResultBlockParam: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            content: components["schemas"]["BetaAdvisorToolResultErrorParam"] | components["schemas"]["BetaAdvisorResultBlockParam"] | components["schemas"]["BetaAdvisorRedactedResultBlockParam"];
            tool_use_id: string;
            
            type: "advisor_tool_result";
        };
        BetaAdvisorToolResultError: {
            
            error_code: "max_uses_exceeded" | "prompt_too_long" | "too_many_requests" | "overloaded" | "unavailable" | "execution_time_exceeded" | "model_not_found";
            
            type: "advisor_tool_result_error";
        };
        BetaAdvisorToolResultErrorParam: {
            
            error_code: "max_uses_exceeded" | "prompt_too_long" | "too_many_requests" | "overloaded" | "unavailable" | "execution_time_exceeded" | "model_not_found";
            
            type: "advisor_tool_result_error";
        };
        BetaAllThinkingTurnsParam: {
            
            type: "all";
        };
        BetaBase64ImageSourceParam: {
            data: string;
            
            media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
            
            type: "base64";
        };
        BetaBase64PDFSource: {
            data: string;
            
            media_type: "application/pdf";
            
            type: "base64";
        };
        BetaBase64PDFSourceParam: {
            data: string;
            
            media_type: "application/pdf";
            
            type: "base64";
        };
        BetaBashCodeExecutionOutputBlock: {
            file_id: string;
            
            type: "bash_code_execution_output";
        };
        BetaBashCodeExecutionOutputBlockParam: {
            file_id: string;
            
            type: "bash_code_execution_output";
        };
        BetaBashCodeExecutionResultBlock: {
            content: components["schemas"]["BetaBashCodeExecutionOutputBlock"][];
            return_code: number;
            stderr: string;
            stdout: string;
            
            type: "bash_code_execution_result";
        };
        BetaBashCodeExecutionResultBlockParam: {
            content: components["schemas"]["BetaBashCodeExecutionOutputBlockParam"][];
            return_code: number;
            stderr: string;
            stdout: string;
            
            type: "bash_code_execution_result";
        };
        BetaBashCodeExecutionToolResultBlock: {
            content: components["schemas"]["BetaBashCodeExecutionToolResultError"] | components["schemas"]["BetaBashCodeExecutionResultBlock"];
            tool_use_id: string;
            
            type: "bash_code_execution_tool_result";
        };
        BetaBashCodeExecutionToolResultBlockParam: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            content: components["schemas"]["BetaBashCodeExecutionToolResultErrorParam"] | components["schemas"]["BetaBashCodeExecutionResultBlockParam"];
            tool_use_id: string;
            
            type: "bash_code_execution_tool_result";
        };
        BetaBashCodeExecutionToolResultError: {
            
            error_code: "invalid_tool_input" | "unavailable" | "too_many_requests" | "execution_time_exceeded" | "output_file_too_large";
            
            type: "bash_code_execution_tool_result_error";
        };
        BetaBashCodeExecutionToolResultErrorParam: {
            
            error_code: "invalid_tool_input" | "unavailable" | "too_many_requests" | "execution_time_exceeded" | "output_file_too_large";
            
            type: "bash_code_execution_tool_result_error";
        };
        BetaBrowserCloseTabConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserCloseTabConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserDoubleClickConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserDoubleClickConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserFileUploadConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserFileUploadConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserFindConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserFindConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserFormInputConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserFormInputConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserGetPageTextConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserGetPageTextConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserHoldKeyConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserHoldKeyConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserHoverConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserHoverConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserJavascriptExecConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserJavascriptExecConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserKeyConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserKeyConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserLeftClickConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserLeftClickConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserLeftClickDragConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserLeftClickDragConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserLeftMouseDownConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserLeftMouseDownConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserLeftMouseUpConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserLeftMouseUpConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserListTabsConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserListTabsConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserMiddleClickConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserMiddleClickConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserMouseMoveConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserMouseMoveConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserNavigateConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserNavigateConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserNewTabConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserNewTabConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserReadConsoleConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserReadConsoleConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserReadNetworkConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserReadNetworkConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserReadPageConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserReadPageConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserRightClickConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserRightClickConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserScreenshotConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserScreenshotConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserScrollConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserScrollConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserScrollToConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserScrollToConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserStateBlockParam: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            state_changes?: (components["schemas"]["BetaBrowserStateChangeTabOpenedParam"] | components["schemas"]["BetaBrowserStateChangeDownloadStartedParam"] | components["schemas"]["BetaBrowserStateChangeDownloadCompletedParam"] | components["schemas"]["BetaBrowserStateChangeDownloadFailedParam"])[] | null;
            tabs: components["schemas"]["BetaBrowserStateTabEntryParam"][];
            
            type: "browser_state";
        };
        BetaBrowserStateChangeDownloadCompletedParam: {
            download_id: string;
            path?: string | null;
            size_bytes?: number | null;
            
            type: "download_completed";
            url: string;
        };
        BetaBrowserStateChangeDownloadFailedParam: {
            download_id: string;
            error?: string | null;
            
            type: "download_failed";
            url: string;
        };
        BetaBrowserStateChangeDownloadStartedParam: {
            download_id: string;
            
            type: "download_started";
            url: string;
        };
        BetaBrowserStateChangeTabOpenedParam: {
            tab_id: string;
            
            type: "tab_opened";
        };
        BetaBrowserStateTabEntryParam: {
            active?: boolean;
            tab_id: string;
            title: string;
            url: string;
        };
        BetaBrowserSwitchTabConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserSwitchTabConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserToolset20260801: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            configs?: components["schemas"]["BetaBrowserToolsetConfigs"] | null;
            
            type: "browser_toolset_20260801";
        };
        BetaBrowserToolset20260801Param: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            configs?: components["schemas"]["BetaBrowserToolsetConfigsParam"] | null;
            
            type: "browser_toolset_20260801";
        };
        BetaBrowserToolsetConfigs: {
            close_tab?: components["schemas"]["BetaBrowserCloseTabConfig"] | null;
            double_click?: components["schemas"]["BetaBrowserDoubleClickConfig"] | null;
            file_upload?: components["schemas"]["BetaBrowserFileUploadConfig"] | null;
            find?: components["schemas"]["BetaBrowserFindConfig"] | null;
            form_input?: components["schemas"]["BetaBrowserFormInputConfig"] | null;
            get_page_text?: components["schemas"]["BetaBrowserGetPageTextConfig"] | null;
            hold_key?: components["schemas"]["BetaBrowserHoldKeyConfig"] | null;
            hover?: components["schemas"]["BetaBrowserHoverConfig"] | null;
            javascript_exec?: components["schemas"]["BetaBrowserJavascriptExecConfig"] | null;
            key?: components["schemas"]["BetaBrowserKeyConfig"] | null;
            left_click?: components["schemas"]["BetaBrowserLeftClickConfig"] | null;
            left_click_drag?: components["schemas"]["BetaBrowserLeftClickDragConfig"] | null;
            left_mouse_down?: components["schemas"]["BetaBrowserLeftMouseDownConfig"] | null;
            left_mouse_up?: components["schemas"]["BetaBrowserLeftMouseUpConfig"] | null;
            list_tabs?: components["schemas"]["BetaBrowserListTabsConfig"] | null;
            middle_click?: components["schemas"]["BetaBrowserMiddleClickConfig"] | null;
            mouse_move?: components["schemas"]["BetaBrowserMouseMoveConfig"] | null;
            navigate?: components["schemas"]["BetaBrowserNavigateConfig"] | null;
            new_tab?: components["schemas"]["BetaBrowserNewTabConfig"] | null;
            read_console?: components["schemas"]["BetaBrowserReadConsoleConfig"] | null;
            read_network?: components["schemas"]["BetaBrowserReadNetworkConfig"] | null;
            read_page?: components["schemas"]["BetaBrowserReadPageConfig"] | null;
            right_click?: components["schemas"]["BetaBrowserRightClickConfig"] | null;
            screenshot?: components["schemas"]["BetaBrowserScreenshotConfig"] | null;
            scroll?: components["schemas"]["BetaBrowserScrollConfig"] | null;
            scroll_to?: components["schemas"]["BetaBrowserScrollToConfig"] | null;
            switch_tab?: components["schemas"]["BetaBrowserSwitchTabConfig"] | null;
            triple_click?: components["schemas"]["BetaBrowserTripleClickConfig"] | null;
            type?: components["schemas"]["BetaBrowserTypeConfig"] | null;
            wait?: components["schemas"]["BetaBrowserWaitConfig"] | null;
            zoom?: components["schemas"]["BetaBrowserZoomConfig"] | null;
        };
        BetaBrowserToolsetConfigsParam: {
            close_tab?: components["schemas"]["BetaBrowserCloseTabConfigParam"] | null;
            double_click?: components["schemas"]["BetaBrowserDoubleClickConfigParam"] | null;
            file_upload?: components["schemas"]["BetaBrowserFileUploadConfigParam"] | null;
            find?: components["schemas"]["BetaBrowserFindConfigParam"] | null;
            form_input?: components["schemas"]["BetaBrowserFormInputConfigParam"] | null;
            get_page_text?: components["schemas"]["BetaBrowserGetPageTextConfigParam"] | null;
            hold_key?: components["schemas"]["BetaBrowserHoldKeyConfigParam"] | null;
            hover?: components["schemas"]["BetaBrowserHoverConfigParam"] | null;
            javascript_exec?: components["schemas"]["BetaBrowserJavascriptExecConfigParam"] | null;
            key?: components["schemas"]["BetaBrowserKeyConfigParam"] | null;
            left_click?: components["schemas"]["BetaBrowserLeftClickConfigParam"] | null;
            left_click_drag?: components["schemas"]["BetaBrowserLeftClickDragConfigParam"] | null;
            left_mouse_down?: components["schemas"]["BetaBrowserLeftMouseDownConfigParam"] | null;
            left_mouse_up?: components["schemas"]["BetaBrowserLeftMouseUpConfigParam"] | null;
            list_tabs?: components["schemas"]["BetaBrowserListTabsConfigParam"] | null;
            middle_click?: components["schemas"]["BetaBrowserMiddleClickConfigParam"] | null;
            mouse_move?: components["schemas"]["BetaBrowserMouseMoveConfigParam"] | null;
            navigate?: components["schemas"]["BetaBrowserNavigateConfigParam"] | null;
            new_tab?: components["schemas"]["BetaBrowserNewTabConfigParam"] | null;
            read_console?: components["schemas"]["BetaBrowserReadConsoleConfigParam"] | null;
            read_network?: components["schemas"]["BetaBrowserReadNetworkConfigParam"] | null;
            read_page?: components["schemas"]["BetaBrowserReadPageConfigParam"] | null;
            right_click?: components["schemas"]["BetaBrowserRightClickConfigParam"] | null;
            screenshot?: components["schemas"]["BetaBrowserScreenshotConfigParam"] | null;
            scroll?: components["schemas"]["BetaBrowserScrollConfigParam"] | null;
            scroll_to?: components["schemas"]["BetaBrowserScrollToConfigParam"] | null;
            switch_tab?: components["schemas"]["BetaBrowserSwitchTabConfigParam"] | null;
            triple_click?: components["schemas"]["BetaBrowserTripleClickConfigParam"] | null;
            type?: components["schemas"]["BetaBrowserTypeConfigParam"] | null;
            wait?: components["schemas"]["BetaBrowserWaitConfigParam"] | null;
            zoom?: components["schemas"]["BetaBrowserZoomConfigParam"] | null;
        };
        BetaBrowserTripleClickConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserTripleClickConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserTypeConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserTypeConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserWaitConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserWaitConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserZoomConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaBrowserZoomConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaCacheControlEphemeral: {
            ttl?: ("5m" | "1h") | null;
            
            type: "ephemeral";
        };
        BetaCacheControlEphemeralParam: {
            
            ttl?: "5m" | "1h";
            
            type: "ephemeral";
        };
        BetaCitationCharLocation: {
            cited_text: string;
            document_index: number;
            document_title?: string | null;
            end_char_index: number;
            file_id?: string | null;
            start_char_index: number;
            
            type: "char_location";
        };
        BetaCitationCharLocationParam: {
            cited_text: string;
            document_index: number;
            document_title: string | null;
            end_char_index: number;
            start_char_index: number;
            
            type: "char_location";
        };
        BetaCitationConfig: {
            enabled: boolean;
        };
        BetaCitationContentBlockLocation: {
            cited_text: string;
            document_index: number;
            document_title?: string | null;
            end_block_index: number;
            file_id?: string | null;
            start_block_index: number;
            
            type: "content_block_location";
        };
        BetaCitationContentBlockLocationParam: {
            cited_text: string;
            document_index: number;
            document_title: string | null;
            end_block_index: number;
            start_block_index: number;
            
            type: "content_block_location";
        };
        BetaCitationPageLocation: {
            cited_text: string;
            document_index: number;
            document_title?: string | null;
            end_page_number: number;
            file_id?: string | null;
            start_page_number: number;
            
            type: "page_location";
        };
        BetaCitationPageLocationParam: {
            cited_text: string;
            document_index: number;
            document_title: string | null;
            end_page_number: number;
            start_page_number: number;
            
            type: "page_location";
        };
        BetaCitationsConfigParam: {
            enabled?: boolean | null;
        };
        BetaCitationsConfigParamParam: {
            enabled?: boolean;
        };
        BetaCitationSearchResultLocation: {
            cited_text: string;
            end_block_index: number;
            search_result_index: number;
            source: string;
            start_block_index: number;
            title?: string | null;
            
            type: "search_result_location";
        };
        BetaCitationSearchResultLocationParam: {
            cited_text: string;
            end_block_index: number;
            search_result_index: number;
            source: string;
            start_block_index: number;
            title: string | null;
            
            type: "search_result_location";
        };
        BetaCitationsWebSearchResultLocation: {
            cited_text: string;
            encrypted_index: string;
            title?: string | null;
            
            type: "web_search_result_location";
            url: string;
        };
        BetaCitationWebSearchResultLocationParam: {
            cited_text: string;
            encrypted_index: string;
            title: string | null;
            
            type: "web_search_result_location";
            url: string;
        };
        BetaClearThinking20251015EditParam: {
            keep?: components["schemas"]["BetaThinkingTurnsParam"] | components["schemas"]["BetaAllThinkingTurnsParam"] | "all";
            
            type: "clear_thinking_20251015";
        };
        BetaClearToolUses20250919EditParam: {
            clear_at_least?: components["schemas"]["BetaInputTokensClearAtLeastParam"] | null;
            clear_tool_inputs?: boolean | string[] | null;
            exclude_tools?: string[] | null;
            keep?: components["schemas"]["BetaToolUsesKeepParam"];
            trigger?: components["schemas"]["BetaInputTokensTriggerParam"] | components["schemas"]["BetaToolUsesTriggerParam"];
            
            type: "clear_tool_uses_20250919";
        };
        BetaCodeExecutionOutputBlock: {
            file_id: string;
            
            type: "code_execution_output";
        };
        BetaCodeExecutionOutputBlockParam: {
            file_id: string;
            
            type: "code_execution_output";
        };
        BetaCodeExecutionResultBlock: {
            content: components["schemas"]["BetaCodeExecutionOutputBlock"][];
            return_code: number;
            stderr: string;
            stdout: string;
            
            type: "code_execution_result";
        };
        BetaCodeExecutionResultBlockParam: {
            content: components["schemas"]["BetaCodeExecutionOutputBlockParam"][];
            return_code: number;
            stderr: string;
            stdout: string;
            
            type: "code_execution_result";
        };
        BetaCodeExecutionTool20250522: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            
            name: "code_execution";
            strict?: boolean | null;
            
            type: "code_execution_20250522";
        };
        BetaCodeExecutionTool20250522Param: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[];
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            defer_loading?: boolean;
            
            name: "code_execution";
            strict?: boolean;
            
            type: "code_execution_20250522";
        };
        BetaCodeExecutionTool20250825: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            
            name: "code_execution";
            strict?: boolean | null;
            
            type: "code_execution_20250825";
        };
        BetaCodeExecutionTool20250825Param: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[];
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            defer_loading?: boolean;
            
            name: "code_execution";
            strict?: boolean;
            
            type: "code_execution_20250825";
        };
        BetaCodeExecutionTool20260120: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            
            name: "code_execution";
            strict?: boolean | null;
            
            type: "code_execution_20260120";
        };
        BetaCodeExecutionTool20260120Param: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[];
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            defer_loading?: boolean;
            
            name: "code_execution";
            strict?: boolean;
            
            type: "code_execution_20260120";
        };
        BetaCodeExecutionTool20260521: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            
            name: "code_execution";
            strict?: boolean | null;
            
            type: "code_execution_20260521";
        };
        BetaCodeExecutionTool20260521Param: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[];
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            defer_loading?: boolean;
            
            name: "code_execution";
            strict?: boolean;
            
            type: "code_execution_20260521";
        };
        BetaCodeExecutionToolResultBlock: {
            content: components["schemas"]["BetaCodeExecutionToolResultError"] | components["schemas"]["BetaCodeExecutionResultBlock"] | components["schemas"]["BetaEncryptedCodeExecutionResultBlock"];
            tool_use_id: string;
            
            type: "code_execution_tool_result";
        };
        BetaCodeExecutionToolResultBlockParam: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            content: components["schemas"]["BetaCodeExecutionToolResultErrorParam"] | components["schemas"]["BetaCodeExecutionResultBlockParam"] | components["schemas"]["BetaEncryptedCodeExecutionResultBlockParam"];
            tool_use_id: string;
            
            type: "code_execution_tool_result";
        };
        BetaCodeExecutionToolResultError: {
            
            error_code: "invalid_tool_input" | "unavailable" | "too_many_requests" | "execution_time_exceeded";
            
            type: "code_execution_tool_result_error";
        };
        BetaCodeExecutionToolResultErrorParam: {
            
            error_code: "invalid_tool_input" | "unavailable" | "too_many_requests" | "execution_time_exceeded";
            
            type: "code_execution_tool_result_error";
        };
        BetaCompact20260112EditParam: {
            instructions?: string | null;
            pause_after_compaction?: boolean;
            trigger?: components["schemas"]["BetaInputTokensTriggerParam"] | null;
            
            type: "compact_20260112";
        };
        BetaCompactionBlock: {
            content?: string | null;
            encrypted_content?: string | null;
            signature?: string | null;
            tool_changes?: (components["schemas"]["BetaResponseToolAdditionBlock"] | components["schemas"]["BetaResponseToolRemovalBlock"])[] | null;
            
            type: "compaction";
        };
        BetaCompactionBlockParam: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            content?: string | null;
            encrypted_content?: string | null;
            signature?: string | null;
            tool_changes?: (components["schemas"]["BetaRequestToolAdditionBlockParam"] | components["schemas"]["BetaRequestToolRemovalBlockParam"])[] | null;
            
            type: "compaction";
        };
        BetaCompactionConfigParam: {
            instructions?: string | null;
            
            type: "summarize";
        };
        BetaComputerCursorPositionConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerCursorPositionConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerDoubleClickConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerDoubleClickConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerHoldKeyConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerHoldKeyConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerKeyConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerKeyConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerLeftClickConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerLeftClickConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerLeftClickDragConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerLeftClickDragConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerLeftMouseDownConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerLeftMouseDownConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerLeftMouseUpConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerLeftMouseUpConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerMiddleClickConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerMiddleClickConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerMouseMoveConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerMouseMoveConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerRightClickConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerRightClickConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerScreenshotConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerScreenshotConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerScrollConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerScrollConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerToolset20260801: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            configs?: components["schemas"]["BetaComputerToolsetConfigs"] | null;
            
            type: "computer_toolset_20260801";
        };
        BetaComputerToolset20260801Param: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            configs?: components["schemas"]["BetaComputerToolsetConfigsParam"] | null;
            
            type: "computer_toolset_20260801";
        };
        BetaComputerToolsetConfigs: {
            cursor_position?: components["schemas"]["BetaComputerCursorPositionConfig"] | null;
            double_click?: components["schemas"]["BetaComputerDoubleClickConfig"] | null;
            hold_key?: components["schemas"]["BetaComputerHoldKeyConfig"] | null;
            key?: components["schemas"]["BetaComputerKeyConfig"] | null;
            left_click?: components["schemas"]["BetaComputerLeftClickConfig"] | null;
            left_click_drag?: components["schemas"]["BetaComputerLeftClickDragConfig"] | null;
            left_mouse_down?: components["schemas"]["BetaComputerLeftMouseDownConfig"] | null;
            left_mouse_up?: components["schemas"]["BetaComputerLeftMouseUpConfig"] | null;
            middle_click?: components["schemas"]["BetaComputerMiddleClickConfig"] | null;
            mouse_move?: components["schemas"]["BetaComputerMouseMoveConfig"] | null;
            right_click?: components["schemas"]["BetaComputerRightClickConfig"] | null;
            screenshot?: components["schemas"]["BetaComputerScreenshotConfig"] | null;
            scroll?: components["schemas"]["BetaComputerScrollConfig"] | null;
            triple_click?: components["schemas"]["BetaComputerTripleClickConfig"] | null;
            type?: components["schemas"]["BetaComputerTypeConfig"] | null;
            wait?: components["schemas"]["BetaComputerWaitConfig"] | null;
            zoom?: components["schemas"]["BetaComputerZoomConfig"] | null;
        };
        BetaComputerToolsetConfigsParam: {
            cursor_position?: components["schemas"]["BetaComputerCursorPositionConfigParam"] | null;
            double_click?: components["schemas"]["BetaComputerDoubleClickConfigParam"] | null;
            hold_key?: components["schemas"]["BetaComputerHoldKeyConfigParam"] | null;
            key?: components["schemas"]["BetaComputerKeyConfigParam"] | null;
            left_click?: components["schemas"]["BetaComputerLeftClickConfigParam"] | null;
            left_click_drag?: components["schemas"]["BetaComputerLeftClickDragConfigParam"] | null;
            left_mouse_down?: components["schemas"]["BetaComputerLeftMouseDownConfigParam"] | null;
            left_mouse_up?: components["schemas"]["BetaComputerLeftMouseUpConfigParam"] | null;
            middle_click?: components["schemas"]["BetaComputerMiddleClickConfigParam"] | null;
            mouse_move?: components["schemas"]["BetaComputerMouseMoveConfigParam"] | null;
            right_click?: components["schemas"]["BetaComputerRightClickConfigParam"] | null;
            screenshot?: components["schemas"]["BetaComputerScreenshotConfigParam"] | null;
            scroll?: components["schemas"]["BetaComputerScrollConfigParam"] | null;
            triple_click?: components["schemas"]["BetaComputerTripleClickConfigParam"] | null;
            type?: components["schemas"]["BetaComputerTypeConfigParam"] | null;
            wait?: components["schemas"]["BetaComputerWaitConfigParam"] | null;
            zoom?: components["schemas"]["BetaComputerZoomConfigParam"] | null;
        };
        BetaComputerTripleClickConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerTripleClickConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerTypeConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerTypeConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerWaitConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerWaitConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerZoomConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaComputerZoomConfigParam: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaContentBlockSourceParam: {
            content: string | (components["schemas"]["BetaTextBlockParam"] | components["schemas"]["BetaImageBlockParam"])[];
            
            type: "content";
        };
        BetaContextManagementConfigParam: {
            edits?: (components["schemas"]["BetaClearToolUses20250919EditParam"] | components["schemas"]["BetaClearThinking20251015EditParam"] | components["schemas"]["BetaCompact20260112EditParam"])[];
        };
        BetaDiagnosticsParam: {
            previous_message_id?: null;
        };
        BetaDirectCaller: {
            
            type: "direct";
        };
        BetaDirectCallerParam: {
            
            type: "direct";
        };
        BetaDocumentBlock: {
            citations?: components["schemas"]["BetaCitationConfig"] | null;
            source: components["schemas"]["BetaBase64PDFSource"] | components["schemas"]["BetaPlainTextSource"];
            title?: string | null;
            
            type: "document";
        };
        BetaEncryptedCodeExecutionResultBlock: {
            content: components["schemas"]["BetaCodeExecutionOutputBlock"][];
            encrypted_stdout: string;
            return_code: number;
            stderr: string;
            
            type: "encrypted_code_execution_result";
        };
        BetaEncryptedCodeExecutionResultBlockParam: {
            content: components["schemas"]["BetaCodeExecutionOutputBlockParam"][];
            encrypted_stdout: string;
            return_code: number;
            stderr: string;
            
            type: "encrypted_code_execution_result";
        };
        BetaFallbackBlock: {
            from: components["schemas"]["BetaFallbackInfo"];
            to: components["schemas"]["BetaFallbackInfo"];
            trigger: components["schemas"]["BetaFallbackRefusalTrigger"];
            
            type: "fallback";
        };
        BetaFallbackBlockParam: {
            from: components["schemas"]["BetaFallbackInfoParam"];
            to: components["schemas"]["BetaFallbackInfoParam"];
            trigger?: unknown;
            
            type: "fallback";
        };
        BetaFallbackInfo: {
            model: ("claude-haiku-5-5" | "claude-sonnet-5-5" | "claude-fable-5-1" | "claude-opus-5-5" | "claude-mythos-5-1" | "claude-sonnet-5" | "claude-fable-5" | "claude-mythos-5" | "claude-opus-5" | "claude-opus-4-8" | "claude-opus-4-7" | "claude-mythos-preview" | "claude-opus-4-6" | "claude-sonnet-4-6" | "claude-haiku-4-5" | "claude-haiku-4-5-20251001" | "claude-opus-4-5" | "claude-opus-4-5-20251101" | "claude-sonnet-4-5" | "claude-sonnet-4-5-20250929") | string;
        };
        BetaFallbackInfoParam: {
            model: ("claude-haiku-5-5" | "claude-sonnet-5-5" | "claude-fable-5-1" | "claude-opus-5-5" | "claude-mythos-5-1" | "claude-sonnet-5" | "claude-fable-5" | "claude-mythos-5" | "claude-opus-5" | "claude-opus-4-8" | "claude-opus-4-7" | "claude-mythos-preview" | "claude-opus-4-6" | "claude-sonnet-4-6" | "claude-haiku-4-5" | "claude-haiku-4-5-20251001" | "claude-opus-4-5" | "claude-opus-4-5-20251101" | "claude-sonnet-4-5" | "claude-sonnet-4-5-20250929") | string;
        };
        BetaFallbackRefusalTrigger: {
            category?: ("cyber" | "bio" | "frontier_llm" | "reasoning_extraction" | "general_harms") | null;
            
            type: "refusal";
        };
        BetaImageBlockParam: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            source: components["schemas"]["BetaBase64ImageSourceParam"] | components["schemas"]["BetaURLImageSourceParam"];
            transformations?: components["schemas"]["BetaImageTransformationsParam"] | null;
            
            type: "image";
        };
        BetaImageTransformationsParam: {
            
            oversized_image?: "downsize" | "error";
        };
        BetaInputTokensClearAtLeastParam: {
            
            type: "input_tokens";
            value: number;
        };
        BetaInputTokensTriggerParam: {
            
            type: "input_tokens";
            value: number;
        };
        BetaJSONOutputFormatParam: {
            schema: {
                [key: string]: unknown;
            };
            
            type: "json_schema";
        };
        BetaMCPTool: {
            description?: string | null;
            input_schema: {
                [key: string]: unknown;
            };
            name: string;
        };
        BetaMCPToolConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaMCPToolConfigParam: {
            defer_loading?: boolean;
            enabled?: boolean;
        };
        BetaMCPToolDefaultConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        };
        BetaMCPToolDefaultConfigParam: {
            defer_loading?: boolean;
            enabled?: boolean;
        };
        BetaMCPToolListingBlock: {
            mcp_server_name: string;
            tools: components["schemas"]["BetaMCPTool"][];
            
            type: "mcp_tool_listing";
        };
        BetaMCPToolListingBlockParam: {
            mcp_server_name: string;
            tools: components["schemas"]["BetaMCPToolParamParam"][];
            
            type: "mcp_tool_listing";
        };
        BetaMCPToolParam: {
            description?: string | null;
            input_schema: {
                [key: string]: unknown;
            };
            name: string;
        };
        BetaMCPToolParamParam: {
            description?: string | null;
            input_schema: {
                [key: string]: unknown;
            };
            name: string;
        };
        BetaMCPToolResultBlock: {
            content: string | components["schemas"]["BetaTextBlock"][];
            is_error: boolean;
            tool_use_id: string;
            
            type: "mcp_tool_result";
        };
        BetaMCPToolset: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            configs?: {
                [key: string]: components["schemas"]["BetaMCPToolConfig"];
            } | null;
            default_config?: components["schemas"]["BetaMCPToolDefaultConfig"] | null;
            mcp_server_name: string;
            tools?: components["schemas"]["BetaMCPToolParam"][] | null;
            
            type: "mcp_toolset";
        };
        BetaMCPToolsetParam: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            configs?: {
                [key: string]: components["schemas"]["BetaMCPToolConfigParam"];
            } | null;
            default_config?: components["schemas"]["BetaMCPToolDefaultConfigParam"];
            mcp_server_name: string;
            tools?: components["schemas"]["BetaMCPToolParamParam"][] | null;
            
            type: "mcp_toolset";
        };
        BetaMCPToolUseBlock: {
            id: string;
            input: {
                [key: string]: unknown;
            };
            name: string;
            server_name: string;
            
            type: "mcp_tool_use";
        };
        BetaMCPToolUseBlockParam: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            id: string;
            input: {
                [key: string]: unknown;
            };
            name: string;
            server_name: string;
            
            type: "mcp_tool_use";
        };
        BetaMemoryTool20250818: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            input_examples?: {
                [key: string]: unknown;
            }[] | null;
            
            name: "memory";
            strict?: boolean | null;
            
            type: "memory_20250818";
        };
        BetaMemoryTool20250818Param: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[];
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            defer_loading?: boolean;
            input_examples?: {
                [key: string]: unknown;
            }[];
            
            name: "memory";
            strict?: boolean;
            
            type: "memory_20250818";
        };
        BetaMessageParam: {
            clear_at?: ("next_user_message" | "never") | null;
            content: string | (components["schemas"]["BetaTextBlockParam"] | components["schemas"]["BetaImageBlockParam"] | components["schemas"]["BetaRequestDocumentBlockParam"] | components["schemas"]["BetaSearchResultBlockParam"] | components["schemas"]["BetaThinkingBlockParam"] | components["schemas"]["BetaRedactedThinkingBlockParam"] | components["schemas"]["BetaToolUseBlockParam"] | components["schemas"]["BetaToolResultBlockParam"] | components["schemas"]["BetaServerToolUseBlockParam"] | components["schemas"]["BetaWebSearchToolResultBlockParam"] | components["schemas"]["BetaWebFetchToolResultBlockParam"] | components["schemas"]["BetaAdvisorToolResultBlockParam"] | components["schemas"]["BetaCodeExecutionToolResultBlockParam"] | components["schemas"]["BetaBashCodeExecutionToolResultBlockParam"] | components["schemas"]["BetaTextEditorCodeExecutionToolResultBlockParam"] | components["schemas"]["BetaToolSearchToolResultBlockParam"] | components["schemas"]["BetaMCPToolUseBlockParam"] | components["schemas"]["BetaRequestMCPToolResultBlockParam"] | components["schemas"]["BetaCompactionBlockParam"] | components["schemas"]["BetaRequestToolAdditionBlockParam"] | components["schemas"]["BetaRequestToolRemovalBlockParam"] | components["schemas"]["BetaMCPToolListingBlockParam"] | components["schemas"]["BetaFallbackBlockParam"] | components["schemas"]["BetaTextBlock"] | components["schemas"]["BetaThinkingBlock"] | components["schemas"]["BetaRedactedThinkingBlock"] | components["schemas"]["BetaToolUseBlock"] | components["schemas"]["BetaServerToolUseBlock"] | components["schemas"]["BetaWebSearchToolResultBlock"] | components["schemas"]["BetaWebFetchToolResultBlock"] | components["schemas"]["BetaAdvisorToolResultBlock"] | components["schemas"]["BetaCodeExecutionToolResultBlock"] | components["schemas"]["BetaBashCodeExecutionToolResultBlock"] | components["schemas"]["BetaTextEditorCodeExecutionToolResultBlock"] | components["schemas"]["BetaToolSearchToolResultBlock"] | components["schemas"]["BetaMCPToolUseBlock"] | components["schemas"]["BetaMCPToolResultBlock"] | components["schemas"]["BetaCompactionBlock"] | components["schemas"]["BetaFallbackBlock"] | components["schemas"]["BetaMCPToolListingBlock"])[];
            output_config?: components["schemas"]["BetaSystemMessageOutputConfigParam"] | null;
            
            role: "user" | "assistant" | "system";
        };
        BetaMetadataParam: {
            user_id?: string | null;
        };
        BetaOutputConfigParam: {
            effort?: ("low" | "medium" | "high" | "xhigh" | "max") | null;
            format?: components["schemas"]["BetaJSONOutputFormatParam"] | null;
            task_budget?: components["schemas"]["BetaTokenTaskBudgetParam"] | null;
        };
        BetaPlainTextSource: {
            data: string;
            
            media_type: "text/plain";
            
            type: "text";
        };
        BetaPlainTextSourceParam: {
            data: string;
            
            media_type: "text/plain";
            
            type: "text";
        };
        BetaRedactedThinkingBlock: {
            data: string;
            
            type: "redacted_thinking";
        };
        BetaRedactedThinkingBlockParam: {
            data: string;
            
            type: "redacted_thinking";
        };
        BetaRequestDocumentBlockParam: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            citations?: components["schemas"]["BetaCitationsConfigParamParam"] | null;
            context?: string | null;
            source: components["schemas"]["BetaBase64PDFSourceParam"] | components["schemas"]["BetaPlainTextSourceParam"] | components["schemas"]["BetaContentBlockSourceParam"] | components["schemas"]["BetaURLPDFSourceParam"];
            title?: string | null;
            
            type: "document";
        };
        BetaRequestMCPServerToolConfigurationParam: {
            allowed_tools?: string[] | null;
            enabled?: boolean | null;
        };
        BetaRequestMCPServerURLDefinitionParam: {
            authorization_token?: string | null;
            name: string;
            tool_configuration?: components["schemas"]["BetaRequestMCPServerToolConfigurationParam"] | null;
            
            type: "url";
            url: string;
        };
        BetaRequestMCPToolResultBlockParam: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            content?: string | components["schemas"]["BetaTextBlockParam"][];
            is_error?: boolean;
            tool_use_id: string;
            
            type: "mcp_tool_result";
        };
        BetaRequestToolAdditionBlockParam: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            tool: components["schemas"]["BetaToolChangeToolReferenceParam"] | components["schemas"]["BetaToolChangeMCPToolReferenceParam"] | components["schemas"]["BetaToolChangeMCPToolsetReferenceParam"] | components["schemas"]["BetaToolChangeToolDefinitionParam"];
            
            type: "tool_addition";
        };
        BetaRequestToolRemovalBlockParam: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            tool: components["schemas"]["BetaToolChangeToolReferenceParam"] | components["schemas"]["BetaToolChangeMCPToolReferenceParam"] | components["schemas"]["BetaToolChangeMCPToolsetReferenceParam"];
            
            type: "tool_removal";
        };
        BetaResponseTool: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            defer_loading?: boolean | null;
            description?: string | null;
            eager_input_streaming?: boolean | null;
            input_examples?: {
                [key: string]: unknown;
            }[] | null;
            input_schema: components["schemas"]["BetaResponseToolInputSchema"];
            name: string;
            strict?: boolean | null;
            type?: "custom" | null;
        };
        BetaResponseToolAdditionBlock: {
            tool: components["schemas"]["BetaResponseToolChangeToolReference"] | components["schemas"]["BetaResponseToolChangeMCPToolReference"] | components["schemas"]["BetaResponseToolChangeMCPToolsetReference"] | components["schemas"]["BetaToolChangeToolDefinition"];
            
            type: "tool_addition";
        };
        BetaResponseToolChangeMCPToolReference: {
            name: string;
            server_name: string;
            
            type: "mcp_tool_reference";
        };
        BetaResponseToolChangeMCPToolsetReference: {
            server_name: string;
            
            type: "mcp_toolset_reference";
        };
        BetaResponseToolChangeToolReference: {
            name: string;
            
            type: "tool_reference";
        };
        BetaResponseToolInputSchema: {
            properties?: {
                [key: string]: unknown;
            } | null;
            required?: string[] | null;
            
            type: "object";
        } & {
            [key: string]: unknown;
        };
        BetaResponseToolRemovalBlock: {
            tool: components["schemas"]["BetaResponseToolChangeToolReference"] | components["schemas"]["BetaResponseToolChangeMCPToolReference"] | components["schemas"]["BetaResponseToolChangeMCPToolsetReference"];
            
            type: "tool_removal";
        };
        BetaSearchResultBlockParam: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            citations?: components["schemas"]["BetaCitationsConfigParamParam"];
            content: components["schemas"]["BetaTextBlockParam"][];
            source: string;
            title: string;
            
            type: "search_result";
        };
        BetaServerToolCaller: {
            tool_id: string;
            
            type: "code_execution_20250825";
        };
        BetaServerToolCaller20260120: {
            tool_id: string;
            
            type: "code_execution_20260120";
        };
        BetaServerToolCaller20260120Param: {
            tool_id: string;
            
            type: "code_execution_20260120";
        };
        BetaServerToolCallerParam: {
            tool_id: string;
            
            type: "code_execution_20250825";
        };
        BetaServerToolUseBlock: {
            caller?: components["schemas"]["BetaDirectCaller"] | components["schemas"]["BetaServerToolCaller"] | components["schemas"]["BetaServerToolCaller20260120"] | null;
            id: string;
            input: {
                [key: string]: unknown;
            };
            
            name: "advisor" | "web_search" | "web_fetch" | "code_execution" | "bash_code_execution" | "text_editor_code_execution" | "tool_search_tool_regex" | "tool_search_tool_bm25";
            
            type: "server_tool_use";
        };
        BetaServerToolUseBlockParam: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            caller?: components["schemas"]["BetaDirectCallerParam"] | components["schemas"]["BetaServerToolCallerParam"] | components["schemas"]["BetaServerToolCaller20260120Param"];
            id: string;
            input: {
                [key: string]: unknown;
            };
            
            name: "advisor" | "web_search" | "web_fetch" | "code_execution" | "bash_code_execution" | "text_editor_code_execution" | "tool_search_tool_regex" | "tool_search_tool_bm25";
            
            type: "server_tool_use";
        };
        BetaSystemMessageOutputConfigParam: {
            effort?: ("low" | "medium" | "high" | "xhigh" | "max") | null;
        };
        BetaTextBlock: {
            citations?: (components["schemas"]["BetaCitationCharLocation"] | components["schemas"]["BetaCitationPageLocation"] | components["schemas"]["BetaCitationContentBlockLocation"] | components["schemas"]["BetaCitationsWebSearchResultLocation"] | components["schemas"]["BetaCitationSearchResultLocation"])[] | null;
            text: string;
            
            type: "text";
        };
        BetaTextBlockParam: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            citations?: (components["schemas"]["BetaCitationCharLocationParam"] | components["schemas"]["BetaCitationPageLocationParam"] | components["schemas"]["BetaCitationContentBlockLocationParam"] | components["schemas"]["BetaCitationWebSearchResultLocationParam"] | components["schemas"]["BetaCitationSearchResultLocationParam"])[] | null;
            text: string;
            
            type: "text";
        };
        BetaTextEditorCodeExecutionCreateResultBlock: {
            is_file_update: boolean;
            
            type: "text_editor_code_execution_create_result";
        };
        BetaTextEditorCodeExecutionCreateResultBlockParam: {
            is_file_update: boolean;
            
            type: "text_editor_code_execution_create_result";
        };
        BetaTextEditorCodeExecutionStrReplaceResultBlock: {
            lines?: string[] | null;
            new_lines?: number | null;
            new_start?: number | null;
            old_lines?: number | null;
            old_start?: number | null;
            
            type: "text_editor_code_execution_str_replace_result";
        };
        BetaTextEditorCodeExecutionStrReplaceResultBlockParam: {
            lines?: string[] | null;
            new_lines?: number | null;
            new_start?: number | null;
            old_lines?: number | null;
            old_start?: number | null;
            
            type: "text_editor_code_execution_str_replace_result";
        };
        BetaTextEditorCodeExecutionToolResultBlock: {
            content: components["schemas"]["BetaTextEditorCodeExecutionToolResultError"] | components["schemas"]["BetaTextEditorCodeExecutionViewResultBlock"] | components["schemas"]["BetaTextEditorCodeExecutionCreateResultBlock"] | components["schemas"]["BetaTextEditorCodeExecutionStrReplaceResultBlock"];
            tool_use_id: string;
            
            type: "text_editor_code_execution_tool_result";
        };
        BetaTextEditorCodeExecutionToolResultBlockParam: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            content: components["schemas"]["BetaTextEditorCodeExecutionToolResultErrorParam"] | components["schemas"]["BetaTextEditorCodeExecutionViewResultBlockParam"] | components["schemas"]["BetaTextEditorCodeExecutionCreateResultBlockParam"] | components["schemas"]["BetaTextEditorCodeExecutionStrReplaceResultBlockParam"];
            tool_use_id: string;
            
            type: "text_editor_code_execution_tool_result";
        };
        BetaTextEditorCodeExecutionToolResultError: {
            
            error_code: "invalid_tool_input" | "unavailable" | "too_many_requests" | "execution_time_exceeded" | "file_not_found";
            error_message?: string | null;
            
            type: "text_editor_code_execution_tool_result_error";
        };
        BetaTextEditorCodeExecutionToolResultErrorParam: {
            
            error_code: "invalid_tool_input" | "unavailable" | "too_many_requests" | "execution_time_exceeded" | "file_not_found";
            error_message?: string | null;
            
            type: "text_editor_code_execution_tool_result_error";
        };
        BetaTextEditorCodeExecutionViewResultBlock: {
            content: string;
            
            file_type: "text" | "image" | "pdf";
            num_lines?: number | null;
            start_line?: number | null;
            total_lines?: number | null;
            
            type: "text_editor_code_execution_view_result";
        };
        BetaTextEditorCodeExecutionViewResultBlockParam: {
            content: string;
            
            file_type: "text" | "image" | "pdf";
            num_lines?: number | null;
            start_line?: number | null;
            total_lines?: number | null;
            
            type: "text_editor_code_execution_view_result";
        };
        BetaThinkingBlock: {
            signature: string;
            thinking: string;
            
            type: "thinking";
        };
        BetaThinkingBlockBindingParam: {
            prefix_mismatch_behavior?: ("error" | "drop_block") | null;
        };
        BetaThinkingBlockParam: {
            signature: string;
            thinking: string;
            
            type: "thinking";
        };
        BetaThinkingConfigAdaptiveParam: {
            block_binding?: components["schemas"]["BetaThinkingBlockBindingParam"] | null;
            display?: ("summarized" | "omitted" | "updates") | null;
            
            type: "adaptive";
        };
        BetaThinkingTurnsParam: {
            
            type: "thinking_turns";
            value: number;
        };
        BetaTokenTaskBudgetParam: {
            remaining?: number | null;
            total: number;
            
            type: "tokens";
        };
        BetaToolBash20241022: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            input_examples?: {
                [key: string]: unknown;
            }[] | null;
            
            name: "bash";
            strict?: boolean | null;
            
            type: "bash_20241022";
        };
        BetaToolBash20241022Param: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[];
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            defer_loading?: boolean;
            input_examples?: {
                [key: string]: unknown;
            }[];
            
            name: "bash";
            strict?: boolean;
            
            type: "bash_20241022";
        };
        BetaToolBash20250124: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            input_examples?: {
                [key: string]: unknown;
            }[] | null;
            
            name: "bash";
            strict?: boolean | null;
            
            type: "bash_20250124";
        };
        BetaToolBash20250124Param: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[];
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            defer_loading?: boolean;
            input_examples?: {
                [key: string]: unknown;
            }[];
            
            name: "bash";
            strict?: boolean;
            
            type: "bash_20250124";
        };
        BetaToolChangeMCPToolReferenceParam: {
            name: string;
            server_name: string;
            
            type: "mcp_tool_reference";
        };
        BetaToolChangeMCPToolsetReferenceParam: {
            server_name: string;
            
            type: "mcp_toolset_reference";
        };
        BetaToolChangeToolDefinition: {
            definition: components["schemas"]["BetaResponseTool"] | components["schemas"]["BetaToolBash20241022"] | components["schemas"]["BetaToolBash20250124"] | components["schemas"]["BetaCodeExecutionTool20250522"] | components["schemas"]["BetaCodeExecutionTool20250825"] | components["schemas"]["BetaCodeExecutionTool20260120"] | components["schemas"]["BetaCodeExecutionTool20260521"] | components["schemas"]["BetaBrowserToolset20260801"] | components["schemas"]["BetaToolComputerUse20241022"] | components["schemas"]["BetaMemoryTool20250818"] | components["schemas"]["BetaToolComputerUse20250124"] | components["schemas"]["BetaToolTextEditor20241022"] | components["schemas"]["BetaToolComputerUse20251124"] | components["schemas"]["BetaComputerToolset20260801"] | components["schemas"]["BetaToolTextEditor20250124"] | components["schemas"]["BetaToolTextEditor20250429"] | components["schemas"]["BetaToolTextEditor20250728"] | components["schemas"]["BetaWebSearchTool20250305"] | components["schemas"]["BetaWebFetchTool20250910"] | components["schemas"]["BetaWebSearchTool20260209"] | components["schemas"]["BetaWebFetchTool20260209"] | components["schemas"]["BetaWebFetchTool20260309"] | components["schemas"]["BetaWebSearchTool20260318"] | components["schemas"]["BetaWebFetchTool20260318"] | components["schemas"]["BetaAdvisorTool20260301"] | components["schemas"]["BetaToolSearchToolBm25_20251119"] | components["schemas"]["BetaToolSearchToolRegex20251119"] | components["schemas"]["BetaMCPToolset"];
            
            type: "tool_definition";
        };
        BetaToolChangeToolDefinitionParam: {
            definition: components["schemas"]["BetaToolParam"] | components["schemas"]["BetaToolBash20241022Param"] | components["schemas"]["BetaToolBash20250124Param"] | components["schemas"]["BetaCodeExecutionTool20250522Param"] | components["schemas"]["BetaCodeExecutionTool20250825Param"] | components["schemas"]["BetaCodeExecutionTool20260120Param"] | components["schemas"]["BetaCodeExecutionTool20260521Param"] | components["schemas"]["BetaBrowserToolset20260801Param"] | components["schemas"]["BetaToolComputerUse20241022Param"] | components["schemas"]["BetaMemoryTool20250818Param"] | components["schemas"]["BetaToolComputerUse20250124Param"] | components["schemas"]["BetaToolTextEditor20241022Param"] | components["schemas"]["BetaToolComputerUse20251124Param"] | components["schemas"]["BetaComputerToolset20260801Param"] | components["schemas"]["BetaToolTextEditor20250124Param"] | components["schemas"]["BetaToolTextEditor20250429Param"] | components["schemas"]["BetaToolTextEditor20250728Param"] | components["schemas"]["BetaWebSearchTool20250305Param"] | components["schemas"]["BetaWebFetchTool20250910Param"] | components["schemas"]["BetaWebSearchTool20260209Param"] | components["schemas"]["BetaWebFetchTool20260209Param"] | components["schemas"]["BetaWebFetchTool20260309Param"] | components["schemas"]["BetaWebSearchTool20260318Param"] | components["schemas"]["BetaWebFetchTool20260318Param"] | components["schemas"]["BetaToolSearchToolBm25_20251119Param"] | components["schemas"]["BetaToolSearchToolRegex20251119Param"] | components["schemas"]["BetaMCPToolsetParam"];
            
            type: "tool_definition";
        };
        BetaToolChangeToolReferenceParam: {
            name: string;
            
            type: "tool_reference";
        };
        BetaToolChoiceAutoParam: {
            disable_parallel_tool_use?: boolean;
            
            type: "auto";
        };
        BetaToolChoiceNoneParam: {
            
            type: "none";
        };
        BetaToolComputerUse20241022: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            display_height_px: number;
            display_number?: number | null;
            display_width_px: number;
            input_examples?: {
                [key: string]: unknown;
            }[] | null;
            
            name: "computer";
            strict?: boolean | null;
            
            type: "computer_20241022";
        };
        BetaToolComputerUse20241022Param: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[];
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            defer_loading?: boolean;
            display_height_px: number;
            display_number?: number | null;
            display_width_px: number;
            input_examples?: {
                [key: string]: unknown;
            }[];
            
            name: "computer";
            strict?: boolean;
            
            type: "computer_20241022";
        };
        BetaToolComputerUse20250124: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            display_height_px: number;
            display_number?: number | null;
            display_width_px: number;
            input_examples?: {
                [key: string]: unknown;
            }[] | null;
            
            name: "computer";
            strict?: boolean | null;
            
            type: "computer_20250124";
        };
        BetaToolComputerUse20250124Param: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[];
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            defer_loading?: boolean;
            display_height_px: number;
            display_number?: number | null;
            display_width_px: number;
            input_examples?: {
                [key: string]: unknown;
            }[];
            
            name: "computer";
            strict?: boolean;
            
            type: "computer_20250124";
        };
        BetaToolComputerUse20251124: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            display_height_px: number;
            display_number?: number | null;
            display_width_px: number;
            enable_zoom?: boolean | null;
            input_examples?: {
                [key: string]: unknown;
            }[] | null;
            
            name: "computer";
            strict?: boolean | null;
            
            type: "computer_20251124";
        };
        BetaToolComputerUse20251124Param: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[];
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            defer_loading?: boolean;
            display_height_px: number;
            display_number?: number | null;
            display_width_px: number;
            enable_zoom?: boolean;
            input_examples?: {
                [key: string]: unknown;
            }[];
            
            name: "computer";
            strict?: boolean;
            
            type: "computer_20251124";
        };
        BetaToolParam: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[];
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            defer_loading?: boolean;
            description?: string;
            eager_input_streaming?: boolean | null;
            input_examples?: {
                [key: string]: unknown;
            }[];
            input_schema: components["schemas"]["InputSchemaTyped"] | {
                [key: string]: unknown;
            };
            name: string;
            strict?: boolean;
            type?: "custom" | null;
        };
        BetaToolReferenceBlock: {
            tool_name: string;
            
            type: "tool_reference";
        };
        BetaToolReferenceBlockParam: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            tool_name: string;
            
            type: "tool_reference";
        };
        BetaToolResultBlockParam: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            content?: string | (components["schemas"]["BetaTextBlockParam"] | components["schemas"]["BetaImageBlockParam"] | components["schemas"]["BetaSearchResultBlockParam"] | components["schemas"]["BetaRequestDocumentBlockParam"] | components["schemas"]["BetaToolReferenceBlockParam"] | components["schemas"]["BetaBrowserStateBlockParam"])[];
            is_error?: boolean;
            tool_use_id: string;
            toolset_name?: string | null;
            
            type: "tool_result";
        };
        BetaToolSearchToolBm25_20251119: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            
            name: "tool_search_tool_bm25";
            strict?: boolean | null;
            
            type: "tool_search_tool_bm25_20251119" | "tool_search_tool_bm25";
        };
        BetaToolSearchToolBm25_20251119Param: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[];
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            defer_loading?: boolean;
            
            name: "tool_search_tool_bm25";
            strict?: boolean;
            
            type: "tool_search_tool_bm25_20251119" | "tool_search_tool_bm25";
        };
        BetaToolSearchToolRegex20251119: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            
            name: "tool_search_tool_regex";
            strict?: boolean | null;
            
            type: "tool_search_tool_regex_20251119" | "tool_search_tool_regex";
        };
        BetaToolSearchToolRegex20251119Param: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[];
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            defer_loading?: boolean;
            
            name: "tool_search_tool_regex";
            strict?: boolean;
            
            type: "tool_search_tool_regex_20251119" | "tool_search_tool_regex";
        };
        BetaToolSearchToolResultBlock: {
            content: components["schemas"]["BetaToolSearchToolResultError"] | components["schemas"]["BetaToolSearchToolSearchResultBlock"];
            tool_use_id: string;
            
            type: "tool_search_tool_result";
        };
        BetaToolSearchToolResultBlockParam: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            content: components["schemas"]["BetaToolSearchToolResultErrorParam"] | components["schemas"]["BetaToolSearchToolSearchResultBlockParam"];
            tool_use_id: string;
            
            type: "tool_search_tool_result";
        };
        BetaToolSearchToolResultError: {
            
            error_code: "invalid_tool_input" | "unavailable" | "too_many_requests" | "execution_time_exceeded";
            error_message?: string | null;
            
            type: "tool_search_tool_result_error";
        };
        BetaToolSearchToolResultErrorParam: {
            
            error_code: "invalid_tool_input" | "unavailable" | "too_many_requests" | "execution_time_exceeded";
            error_message?: string | null;
            
            type: "tool_search_tool_result_error";
        };
        BetaToolSearchToolSearchResultBlock: {
            tool_references: components["schemas"]["BetaToolReferenceBlock"][];
            
            type: "tool_search_tool_search_result";
        };
        BetaToolSearchToolSearchResultBlockParam: {
            tool_references: components["schemas"]["BetaToolReferenceBlockParam"][];
            
            type: "tool_search_tool_search_result";
        };
        BetaToolTextEditor20241022: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            input_examples?: {
                [key: string]: unknown;
            }[] | null;
            
            name: "str_replace_editor";
            strict?: boolean | null;
            
            type: "text_editor_20241022";
        };
        BetaToolTextEditor20241022Param: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[];
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            defer_loading?: boolean;
            input_examples?: {
                [key: string]: unknown;
            }[];
            
            name: "str_replace_editor";
            strict?: boolean;
            
            type: "text_editor_20241022";
        };
        BetaToolTextEditor20250124: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            input_examples?: {
                [key: string]: unknown;
            }[] | null;
            
            name: "str_replace_editor";
            strict?: boolean | null;
            
            type: "text_editor_20250124";
        };
        BetaToolTextEditor20250124Param: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[];
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            defer_loading?: boolean;
            input_examples?: {
                [key: string]: unknown;
            }[];
            
            name: "str_replace_editor";
            strict?: boolean;
            
            type: "text_editor_20250124";
        };
        BetaToolTextEditor20250429: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            input_examples?: {
                [key: string]: unknown;
            }[] | null;
            
            name: "str_replace_based_edit_tool";
            strict?: boolean | null;
            
            type: "text_editor_20250429";
        };
        BetaToolTextEditor20250429Param: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[];
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            defer_loading?: boolean;
            input_examples?: {
                [key: string]: unknown;
            }[];
            
            name: "str_replace_based_edit_tool";
            strict?: boolean;
            
            type: "text_editor_20250429";
        };
        BetaToolTextEditor20250728: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            input_examples?: {
                [key: string]: unknown;
            }[] | null;
            max_characters?: number | null;
            
            name: "str_replace_based_edit_tool";
            strict?: boolean | null;
            
            type: "text_editor_20250728";
        };
        BetaToolTextEditor20250728Param: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[];
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            defer_loading?: boolean;
            input_examples?: {
                [key: string]: unknown;
            }[];
            max_characters?: number | null;
            
            name: "str_replace_based_edit_tool";
            strict?: boolean;
            
            type: "text_editor_20250728";
        };
        BetaToolUseBlock: {
            caller?: components["schemas"]["BetaDirectCaller"] | components["schemas"]["BetaServerToolCaller"] | components["schemas"]["BetaServerToolCaller20260120"] | null;
            id: string;
            input: {
                [key: string]: unknown;
            };
            name: string;
            toolset_name?: string | null;
            
            type: "tool_use";
        };
        BetaToolUseBlockParam: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            caller?: components["schemas"]["BetaDirectCallerParam"] | components["schemas"]["BetaServerToolCallerParam"] | components["schemas"]["BetaServerToolCaller20260120Param"];
            id: string;
            input: {
                [key: string]: unknown;
            };
            name: string;
            toolset_name?: string | null;
            
            type: "tool_use";
        };
        BetaToolUsesKeepParam: {
            
            type: "tool_uses";
            value: number;
        };
        BetaToolUsesTriggerParam: {
            
            type: "tool_uses";
            value: number;
        };
        BetaURLImageSourceParam: {
            
            type: "url";
            url: string;
        };
        BetaURLPDFSourceParam: {
            
            type: "url";
            url: string;
        };
        BetaUserLocation: {
            city?: string | null;
            country?: string | null;
            region?: string | null;
            timezone?: string | null;
            
            type: "approximate";
        };
        BetaUserLocationParam: {
            city?: string | null;
            country?: string | null;
            region?: string | null;
            timezone?: string | null;
            
            type: "approximate";
        };
        BetaWebFetchBlock: {
            content: components["schemas"]["BetaDocumentBlock"];
            retrieved_at?: string | null;
            
            type: "web_fetch_result";
            url: string;
        };
        BetaWebFetchBlockParam: {
            content: components["schemas"]["BetaRequestDocumentBlockParam"];
            retrieved_at?: string | null;
            
            type: "web_fetch_result";
            url: string;
        };
        BetaWebFetchTool20250910: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            allowed_domains?: string[] | null;
            blocked_domains?: string[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            citations?: components["schemas"]["BetaCitationsConfigParam"] | null;
            defer_loading?: boolean | null;
            max_content_tokens?: number | null;
            max_uses?: number | null;
            
            name: "web_fetch";
            strict?: boolean | null;
            
            type: "web_fetch_20250910";
            url_sources?: components["schemas"]["BetaWebFetchURLSources"] | null;
        };
        BetaWebFetchTool20250910Param: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[];
            allowed_domains?: string[] | null;
            blocked_domains?: string[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            citations?: components["schemas"]["BetaCitationsConfigParamParam"] | null;
            defer_loading?: boolean;
            max_content_tokens?: number | null;
            max_uses?: number | null;
            
            name: "web_fetch";
            strict?: boolean;
            
            type: "web_fetch_20250910";
            url_sources?: components["schemas"]["BetaWebFetchURLSourcesParam"] | null;
        };
        BetaWebFetchTool20260209: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            allowed_domains?: string[] | null;
            blocked_domains?: string[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            citations?: components["schemas"]["BetaCitationsConfigParam"] | null;
            defer_loading?: boolean | null;
            max_content_tokens?: number | null;
            max_uses?: number | null;
            
            name: "web_fetch";
            strict?: boolean | null;
            
            type: "web_fetch_20260209";
            url_sources?: components["schemas"]["BetaWebFetchURLSources"] | null;
        };
        BetaWebFetchTool20260209Param: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[];
            allowed_domains?: string[] | null;
            blocked_domains?: string[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            citations?: components["schemas"]["BetaCitationsConfigParamParam"] | null;
            defer_loading?: boolean;
            max_content_tokens?: number | null;
            max_uses?: number | null;
            
            name: "web_fetch";
            strict?: boolean;
            
            type: "web_fetch_20260209";
            url_sources?: components["schemas"]["BetaWebFetchURLSourcesParam"] | null;
        };
        BetaWebFetchTool20260309: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            allowed_domains?: string[] | null;
            blocked_domains?: string[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            citations?: components["schemas"]["BetaCitationsConfigParam"] | null;
            defer_loading?: boolean | null;
            max_content_tokens?: number | null;
            max_uses?: number | null;
            
            name: "web_fetch";
            strict?: boolean | null;
            
            type: "web_fetch_20260309";
            url_sources?: components["schemas"]["BetaWebFetchURLSources"] | null;
            use_cache?: boolean | null;
        };
        BetaWebFetchTool20260309Param: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[];
            allowed_domains?: string[] | null;
            blocked_domains?: string[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            citations?: components["schemas"]["BetaCitationsConfigParamParam"] | null;
            defer_loading?: boolean;
            max_content_tokens?: number | null;
            max_uses?: number | null;
            
            name: "web_fetch";
            strict?: boolean;
            
            type: "web_fetch_20260309";
            url_sources?: components["schemas"]["BetaWebFetchURLSourcesParam"] | null;
            use_cache?: boolean;
        };
        BetaWebFetchTool20260318: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            allowed_domains?: string[] | null;
            blocked_domains?: string[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            citations?: components["schemas"]["BetaCitationsConfigParam"] | null;
            defer_loading?: boolean | null;
            max_content_tokens?: number | null;
            max_uses?: number | null;
            
            name: "web_fetch";
            response_inclusion?: ("full" | "excluded") | null;
            strict?: boolean | null;
            
            type: "web_fetch_20260318";
            url_sources?: components["schemas"]["BetaWebFetchURLSources"] | null;
            use_cache?: boolean | null;
        };
        BetaWebFetchTool20260318Param: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[];
            allowed_domains?: string[] | null;
            blocked_domains?: string[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            citations?: components["schemas"]["BetaCitationsConfigParamParam"] | null;
            defer_loading?: boolean;
            max_content_tokens?: number | null;
            max_uses?: number | null;
            
            name: "web_fetch";
            
            response_inclusion?: "full" | "excluded";
            strict?: boolean;
            
            type: "web_fetch_20260318";
            url_sources?: components["schemas"]["BetaWebFetchURLSourcesParam"] | null;
            use_cache?: boolean;
        };
        BetaWebFetchToolResultBlock: {
            caller?: components["schemas"]["BetaDirectCaller"] | components["schemas"]["BetaServerToolCaller"] | components["schemas"]["BetaServerToolCaller20260120"] | null;
            content: components["schemas"]["BetaWebFetchToolResultErrorBlock"] | components["schemas"]["BetaWebFetchBlock"];
            tool_use_id: string;
            
            type: "web_fetch_tool_result";
        };
        BetaWebFetchToolResultBlockParam: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            caller?: components["schemas"]["BetaDirectCallerParam"] | components["schemas"]["BetaServerToolCallerParam"] | components["schemas"]["BetaServerToolCaller20260120Param"];
            content: components["schemas"]["BetaWebFetchToolResultErrorBlockParam"] | components["schemas"]["BetaWebFetchBlockParam"];
            tool_use_id: string;
            
            type: "web_fetch_tool_result";
        };
        BetaWebFetchToolResultErrorBlock: {
            
            error_code: "invalid_tool_input" | "url_too_long" | "url_not_allowed" | "url_not_in_prior_context" | "url_not_accessible" | "unsupported_content_type" | "too_many_requests" | "max_uses_exceeded" | "unavailable" | "content_too_large";
            
            type: "web_fetch_tool_result_error";
        };
        BetaWebFetchToolResultErrorBlockParam: {
            
            error_code: "invalid_tool_input" | "url_too_long" | "url_not_allowed" | "url_not_in_prior_context" | "url_not_accessible" | "unsupported_content_type" | "too_many_requests" | "max_uses_exceeded" | "unavailable" | "content_too_large";
            
            type: "web_fetch_tool_result_error";
        };
        BetaWebFetchURLSourceAll: {
            
            type: "all";
        };
        BetaWebFetchURLSourceAllParam: {
            
            type: "all";
        };
        BetaWebFetchURLSourceExcept: {
            tools: components["schemas"]["BetaWebFetchURLSourceToolReference"][];
            
            type: "except";
        };
        BetaWebFetchURLSourceExceptParam: {
            tools: components["schemas"]["BetaWebFetchURLSourceToolReferenceParam"][];
            
            type: "except";
        };
        BetaWebFetchURLSourceNone: {
            
            type: "none";
        };
        BetaWebFetchURLSourceNoneParam: {
            
            type: "none";
        };
        BetaWebFetchURLSourceOnly: {
            tools: components["schemas"]["BetaWebFetchURLSourceToolReference"][];
            
            type: "only";
        };
        BetaWebFetchURLSourceOnlyParam: {
            tools: components["schemas"]["BetaWebFetchURLSourceToolReferenceParam"][];
            
            type: "only";
        };
        BetaWebFetchURLSources: {
            client_tool_results?: components["schemas"]["BetaWebFetchURLSourceAll"] | components["schemas"]["BetaWebFetchURLSourceNone"] | components["schemas"]["BetaWebFetchURLSourceOnly"] | components["schemas"]["BetaWebFetchURLSourceExcept"] | null;
            server_tool_results?: components["schemas"]["BetaWebFetchURLSourceAll"] | components["schemas"]["BetaWebFetchURLSourceNone"] | components["schemas"]["BetaWebFetchURLSourceOnly"] | components["schemas"]["BetaWebFetchURLSourceExcept"] | null;
            user_input?: components["schemas"]["BetaWebFetchURLSourceAll"] | components["schemas"]["BetaWebFetchURLSourceNone"] | null;
        };
        BetaWebFetchURLSourcesParam: {
            client_tool_results?: components["schemas"]["BetaWebFetchURLSourceAllParam"] | components["schemas"]["BetaWebFetchURLSourceNoneParam"] | components["schemas"]["BetaWebFetchURLSourceOnlyParam"] | components["schemas"]["BetaWebFetchURLSourceExceptParam"];
            server_tool_results?: components["schemas"]["BetaWebFetchURLSourceAllParam"] | components["schemas"]["BetaWebFetchURLSourceNoneParam"] | components["schemas"]["BetaWebFetchURLSourceOnlyParam"] | components["schemas"]["BetaWebFetchURLSourceExceptParam"];
            user_input?: components["schemas"]["BetaWebFetchURLSourceAllParam"] | components["schemas"]["BetaWebFetchURLSourceNoneParam"];
        };
        BetaWebFetchURLSourceToolReference: {
            name: string;
            
            type: "tool_reference";
        };
        BetaWebFetchURLSourceToolReferenceParam: {
            name: string;
            
            type: "tool_reference";
        };
        BetaWebSearchResultBlock: {
            encrypted_content: string;
            page_age?: string | null;
            title: string;
            
            type: "web_search_result";
            url: string;
        };
        BetaWebSearchResultBlockParam: {
            encrypted_content: string;
            page_age?: string | null;
            title: string;
            
            type: "web_search_result";
            url: string;
        };
        BetaWebSearchTool20250305: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            allowed_domains?: string[] | null;
            blocked_domains?: string[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            max_uses?: number | null;
            
            name: "web_search";
            strict?: boolean | null;
            
            type: "web_search_20250305";
            user_location?: components["schemas"]["BetaUserLocation"] | null;
        };
        BetaWebSearchTool20250305Param: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[];
            allowed_domains?: string[] | null;
            blocked_domains?: string[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            defer_loading?: boolean;
            max_uses?: number | null;
            
            name: "web_search";
            strict?: boolean;
            
            type: "web_search_20250305";
            user_location?: components["schemas"]["BetaUserLocationParam"] | null;
        };
        BetaWebSearchTool20260209: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            allowed_domains?: string[] | null;
            blocked_domains?: string[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            max_uses?: number | null;
            
            name: "web_search";
            strict?: boolean | null;
            
            type: "web_search_20260209";
            user_location?: components["schemas"]["BetaUserLocation"] | null;
        };
        BetaWebSearchTool20260209Param: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[];
            allowed_domains?: string[] | null;
            blocked_domains?: string[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            defer_loading?: boolean;
            max_uses?: number | null;
            
            name: "web_search";
            strict?: boolean;
            
            type: "web_search_20260209";
            user_location?: components["schemas"]["BetaUserLocationParam"] | null;
        };
        BetaWebSearchTool20260318: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            allowed_domains?: string[] | null;
            blocked_domains?: string[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            max_uses?: number | null;
            
            name: "web_search";
            response_inclusion?: ("full" | "excluded") | null;
            strict?: boolean | null;
            
            type: "web_search_20260318";
            user_location?: components["schemas"]["BetaUserLocation"] | null;
        };
        BetaWebSearchTool20260318Param: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[];
            allowed_domains?: string[] | null;
            blocked_domains?: string[] | null;
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            defer_loading?: boolean;
            max_uses?: number | null;
            
            name: "web_search";
            
            response_inclusion?: "full" | "excluded";
            strict?: boolean;
            
            type: "web_search_20260318";
            user_location?: components["schemas"]["BetaUserLocationParam"] | null;
        };
        BetaWebSearchToolRequestErrorParam: {
            
            error_code: "invalid_tool_input" | "unavailable" | "max_uses_exceeded" | "too_many_requests" | "query_too_long" | "request_too_large";
            
            type: "web_search_tool_result_error";
        };
        BetaWebSearchToolResultBlock: {
            caller?: components["schemas"]["BetaDirectCaller"] | components["schemas"]["BetaServerToolCaller"] | components["schemas"]["BetaServerToolCaller20260120"] | null;
            content: components["schemas"]["BetaWebSearchToolResultError"] | components["schemas"]["BetaWebSearchResultBlock"][];
            tool_use_id: string;
            
            type: "web_search_tool_result";
        };
        BetaWebSearchToolResultBlockParam: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            caller?: components["schemas"]["BetaDirectCallerParam"] | components["schemas"]["BetaServerToolCallerParam"] | components["schemas"]["BetaServerToolCaller20260120Param"];
            content: components["schemas"]["BetaWebSearchResultBlockParam"][] | components["schemas"]["BetaWebSearchToolRequestErrorParam"];
            tool_use_id: string;
            
            type: "web_search_tool_result";
        };
        BetaWebSearchToolResultError: {
            
            error_code: "invalid_tool_input" | "unavailable" | "max_uses_exceeded" | "too_many_requests" | "query_too_long" | "request_too_large";
            
            type: "web_search_tool_result_error";
        };
        InputSchemaTyped: {
            properties?: {
                [key: string]: unknown;
            } | null;
            required?: string[] | null;
            
            type: "object";
        };
        MessagesErrorEvent: {
            error: {
                message: string;
                type: string;
            };
            request_id?: string | null;
            
            type: "error";
        };
        MessagesEvent: components["schemas"]["Output_BetaRawMessageStartEvent"] | components["schemas"]["Output_BetaRawMessageDeltaEvent"] | components["schemas"]["Output_BetaRawMessageStopEvent"] | components["schemas"]["Output_BetaRawContentBlockStartEvent"] | components["schemas"]["Output_BetaRawContentBlockDeltaEvent"] | components["schemas"]["Output_BetaRawContentBlockStopEvent"] | components["schemas"]["MessagesPingEvent"] | components["schemas"]["MessagesErrorEvent"];
        MessagesPingEvent: {
            
            type: "ping";
        };
        MessagesRequest: {
            cache_control?: components["schemas"]["BetaCacheControlEphemeralParam"] | null;
            compaction?: components["schemas"]["BetaCompactionConfigParam"] | null;
            container?: null;
            context_management?: components["schemas"]["BetaContextManagementConfigParam"] | null;
            diagnostics?: components["schemas"]["BetaDiagnosticsParam"] | null;
            fallback?: null;
            fallback_credit_token?: null;
            fallbacks?: null;
            inference_geo?: string | null;
            max_tokens: number;
            mcp_servers?: components["schemas"]["BetaRequestMCPServerURLDefinitionParam"][];
            messages: components["schemas"]["BetaMessageParam"][];
            metadata?: components["schemas"]["BetaMetadataParam"];
            
            model: "anthropic/claude-opus-5-5";
            output_config?: components["schemas"]["BetaOutputConfigParam"];
            
            output_format?: components["schemas"]["BetaJSONOutputFormatParam"] | null;
            
            service_tier?: "auto" | "standard_only";
            speed?: ("standard" | "fast") | null;
            stop_sequences?: string[];
            stream?: boolean;
            system?: string | components["schemas"]["BetaTextBlockParam"][];
            
            temperature?: 1;
            thinking?: components["schemas"]["BetaThinkingConfigAdaptiveParam"];
            tool_choice?: components["schemas"]["BetaToolChoiceAutoParam"] | components["schemas"]["BetaToolChoiceNoneParam"];
            tools?: (components["schemas"]["BetaToolParam"] | components["schemas"]["BetaToolBash20241022Param"] | components["schemas"]["BetaToolBash20250124Param"] | components["schemas"]["BetaCodeExecutionTool20250522Param"] | components["schemas"]["BetaCodeExecutionTool20250825Param"] | components["schemas"]["BetaCodeExecutionTool20260120Param"] | components["schemas"]["BetaCodeExecutionTool20260521Param"] | components["schemas"]["BetaBrowserToolset20260801Param"] | components["schemas"]["BetaToolComputerUse20241022Param"] | components["schemas"]["BetaMemoryTool20250818Param"] | components["schemas"]["BetaToolComputerUse20250124Param"] | components["schemas"]["BetaToolTextEditor20241022Param"] | components["schemas"]["BetaToolComputerUse20251124Param"] | components["schemas"]["BetaComputerToolset20260801Param"] | components["schemas"]["BetaToolTextEditor20250124Param"] | components["schemas"]["BetaToolTextEditor20250429Param"] | components["schemas"]["BetaToolTextEditor20250728Param"] | components["schemas"]["BetaWebSearchTool20250305Param"] | components["schemas"]["BetaWebFetchTool20250910Param"] | components["schemas"]["BetaWebSearchTool20260209Param"] | components["schemas"]["BetaWebFetchTool20260209Param"] | components["schemas"]["BetaWebFetchTool20260309Param"] | components["schemas"]["BetaWebSearchTool20260318Param"] | components["schemas"]["BetaWebFetchTool20260318Param"] | components["schemas"]["BetaToolSearchToolBm25_20251119Param"] | components["schemas"]["BetaToolSearchToolRegex20251119Param"] | components["schemas"]["BetaMCPToolsetParam"])[];
            
            top_p?: number;
        } & unknown;
        MessagesResponse: components["schemas"]["Output_BetaMessage"];
        Output_BetaAdvisorMessageIterationUsage: {
            cache_creation?: components["schemas"]["Output_BetaCacheCreation"] | null;
            cache_creation_input_tokens: number;
            cache_read_input_tokens: number;
            input_tokens: number;
            model: ("claude-haiku-5-5" | "claude-sonnet-5-5" | "claude-fable-5-1" | "claude-opus-5-5" | "claude-mythos-5-1" | "claude-sonnet-5" | "claude-fable-5" | "claude-mythos-5" | "claude-opus-5" | "claude-opus-4-8" | "claude-opus-4-7" | "claude-mythos-preview" | "claude-opus-4-6" | "claude-sonnet-4-6" | "claude-haiku-4-5" | "claude-haiku-4-5-20251001" | "claude-opus-4-5" | "claude-opus-4-5-20251101" | "claude-sonnet-4-5" | "claude-sonnet-4-5-20250929") | string;
            output_tokens: number;
            
            type: "advisor_message";
        } & {
            [key: string]: unknown;
        };
        Output_BetaAdvisorRedactedResultBlock: {
            encrypted_content: string;
            stop_reason?: string | null;
            
            type: "advisor_redacted_result";
        } & {
            [key: string]: unknown;
        };
        Output_BetaAdvisorResultBlock: {
            stop_reason?: string | null;
            text: string;
            
            type: "advisor_result";
        } & {
            [key: string]: unknown;
        };
        Output_BetaAdvisorTool20260301: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            caching?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            max_tokens?: number | null;
            max_uses?: number | null;
            model: ("claude-haiku-5-5" | "claude-sonnet-5-5" | "claude-fable-5-1" | "claude-opus-5-5" | "claude-mythos-5-1" | "claude-sonnet-5" | "claude-fable-5" | "claude-mythos-5" | "claude-opus-5" | "claude-opus-4-8" | "claude-opus-4-7" | "claude-mythos-preview" | "claude-opus-4-6" | "claude-sonnet-4-6" | "claude-haiku-4-5" | "claude-haiku-4-5-20251001" | "claude-opus-4-5" | "claude-opus-4-5-20251101" | "claude-sonnet-4-5" | "claude-sonnet-4-5-20250929") | string;
            
            name: "advisor";
            strict?: boolean | null;
            
            type: "advisor_20260301";
        } & {
            [key: string]: unknown;
        };
        Output_BetaAdvisorToolResultBlock: {
            content: components["schemas"]["Output_BetaAdvisorToolResultError"] | components["schemas"]["Output_BetaAdvisorResultBlock"] | components["schemas"]["Output_BetaAdvisorRedactedResultBlock"];
            tool_use_id: string;
            
            type: "advisor_tool_result";
        } & {
            [key: string]: unknown;
        };
        Output_BetaAdvisorToolResultError: {
            
            error_code: "max_uses_exceeded" | "prompt_too_long" | "too_many_requests" | "overloaded" | "unavailable" | "execution_time_exceeded" | "model_not_found";
            
            type: "advisor_tool_result_error";
        } & {
            [key: string]: unknown;
        };
        Output_BetaBase64PDFSource: {
            data: string;
            
            media_type: "application/pdf";
            
            type: "base64";
        } & {
            [key: string]: unknown;
        };
        Output_BetaBashCodeExecutionOutputBlock: {
            file_id: string;
            
            type: "bash_code_execution_output";
        } & {
            [key: string]: unknown;
        };
        Output_BetaBashCodeExecutionResultBlock: {
            content: components["schemas"]["Output_BetaBashCodeExecutionOutputBlock"][];
            return_code: number;
            stderr: string;
            stdout: string;
            
            type: "bash_code_execution_result";
        } & {
            [key: string]: unknown;
        };
        Output_BetaBashCodeExecutionToolResultBlock: {
            content: components["schemas"]["Output_BetaBashCodeExecutionToolResultError"] | components["schemas"]["Output_BetaBashCodeExecutionResultBlock"];
            tool_use_id: string;
            
            type: "bash_code_execution_tool_result";
        } & {
            [key: string]: unknown;
        };
        Output_BetaBashCodeExecutionToolResultError: {
            
            error_code: "invalid_tool_input" | "unavailable" | "too_many_requests" | "execution_time_exceeded" | "output_file_too_large";
            
            type: "bash_code_execution_tool_result_error";
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserCloseTabConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserDoubleClickConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserFileUploadConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserFindConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserFormInputConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserGetPageTextConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserHoldKeyConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserHoverConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserJavascriptExecConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserKeyConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserLeftClickConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserLeftClickDragConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserLeftMouseDownConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserLeftMouseUpConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserListTabsConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserMiddleClickConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserMouseMoveConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserNavigateConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserNewTabConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserReadConsoleConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserReadNetworkConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserReadPageConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserRightClickConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserScreenshotConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserScrollConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserScrollToConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserSwitchTabConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserToolset20260801: {
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            configs?: components["schemas"]["Output_BetaBrowserToolsetConfigs"] | null;
            
            type: "browser_toolset_20260801";
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserToolsetConfigs: {
            close_tab?: components["schemas"]["Output_BetaBrowserCloseTabConfig"] | null;
            double_click?: components["schemas"]["Output_BetaBrowserDoubleClickConfig"] | null;
            file_upload?: components["schemas"]["Output_BetaBrowserFileUploadConfig"] | null;
            find?: components["schemas"]["Output_BetaBrowserFindConfig"] | null;
            form_input?: components["schemas"]["Output_BetaBrowserFormInputConfig"] | null;
            get_page_text?: components["schemas"]["Output_BetaBrowserGetPageTextConfig"] | null;
            hold_key?: components["schemas"]["Output_BetaBrowserHoldKeyConfig"] | null;
            hover?: components["schemas"]["Output_BetaBrowserHoverConfig"] | null;
            javascript_exec?: components["schemas"]["Output_BetaBrowserJavascriptExecConfig"] | null;
            key?: components["schemas"]["Output_BetaBrowserKeyConfig"] | null;
            left_click?: components["schemas"]["Output_BetaBrowserLeftClickConfig"] | null;
            left_click_drag?: components["schemas"]["Output_BetaBrowserLeftClickDragConfig"] | null;
            left_mouse_down?: components["schemas"]["Output_BetaBrowserLeftMouseDownConfig"] | null;
            left_mouse_up?: components["schemas"]["Output_BetaBrowserLeftMouseUpConfig"] | null;
            list_tabs?: components["schemas"]["Output_BetaBrowserListTabsConfig"] | null;
            middle_click?: components["schemas"]["Output_BetaBrowserMiddleClickConfig"] | null;
            mouse_move?: components["schemas"]["Output_BetaBrowserMouseMoveConfig"] | null;
            navigate?: components["schemas"]["Output_BetaBrowserNavigateConfig"] | null;
            new_tab?: components["schemas"]["Output_BetaBrowserNewTabConfig"] | null;
            read_console?: components["schemas"]["Output_BetaBrowserReadConsoleConfig"] | null;
            read_network?: components["schemas"]["Output_BetaBrowserReadNetworkConfig"] | null;
            read_page?: components["schemas"]["Output_BetaBrowserReadPageConfig"] | null;
            right_click?: components["schemas"]["Output_BetaBrowserRightClickConfig"] | null;
            screenshot?: components["schemas"]["Output_BetaBrowserScreenshotConfig"] | null;
            scroll?: components["schemas"]["Output_BetaBrowserScrollConfig"] | null;
            scroll_to?: components["schemas"]["Output_BetaBrowserScrollToConfig"] | null;
            switch_tab?: components["schemas"]["Output_BetaBrowserSwitchTabConfig"] | null;
            triple_click?: components["schemas"]["Output_BetaBrowserTripleClickConfig"] | null;
            type?: components["schemas"]["Output_BetaBrowserTypeConfig"] | null;
            wait?: components["schemas"]["Output_BetaBrowserWaitConfig"] | null;
            zoom?: components["schemas"]["Output_BetaBrowserZoomConfig"] | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserTripleClickConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserTypeConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserWaitConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaBrowserZoomConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaCacheControlEphemeral: {
            ttl?: ("5m" | "1h") | null;
            
            type: "ephemeral";
        } & {
            [key: string]: unknown;
        };
        Output_BetaCacheCreation: {
            ephemeral_1h_input_tokens: number;
            ephemeral_5m_input_tokens: number;
        } & {
            [key: string]: unknown;
        };
        Output_BetaCacheMissMessagesChanged: {
            cache_missed_input_tokens: number;
            
            type: "messages_changed";
        } & {
            [key: string]: unknown;
        };
        Output_BetaCacheMissModelChanged: {
            cache_missed_input_tokens: number;
            
            type: "model_changed";
        } & {
            [key: string]: unknown;
        };
        Output_BetaCacheMissPreviousMessageNotFound: {
            
            type: "previous_message_not_found";
        } & {
            [key: string]: unknown;
        };
        Output_BetaCacheMissSystemChanged: {
            cache_missed_input_tokens: number;
            
            type: "system_changed";
        } & {
            [key: string]: unknown;
        };
        Output_BetaCacheMissToolsChanged: {
            cache_missed_input_tokens: number;
            
            type: "tools_changed";
        } & {
            [key: string]: unknown;
        };
        Output_BetaCacheMissUnavailable: {
            
            type: "unavailable";
        } & {
            [key: string]: unknown;
        };
        Output_BetaCitationCharLocation: {
            cited_text: string;
            document_index: number;
            document_title?: string | null;
            end_char_index: number;
            file_id?: string | null;
            start_char_index: number;
            
            type: "char_location";
        } & {
            [key: string]: unknown;
        };
        Output_BetaCitationConfig: {
            enabled: boolean;
        } & {
            [key: string]: unknown;
        };
        Output_BetaCitationContentBlockLocation: {
            cited_text: string;
            document_index: number;
            document_title?: string | null;
            end_block_index: number;
            file_id?: string | null;
            start_block_index: number;
            
            type: "content_block_location";
        } & {
            [key: string]: unknown;
        };
        Output_BetaCitationPageLocation: {
            cited_text: string;
            document_index: number;
            document_title?: string | null;
            end_page_number: number;
            file_id?: string | null;
            start_page_number: number;
            
            type: "page_location";
        } & {
            [key: string]: unknown;
        };
        Output_BetaCitationsConfigParam: {
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaCitationsDelta: {
            citation: components["schemas"]["Output_BetaCitationCharLocation"] | components["schemas"]["Output_BetaCitationPageLocation"] | components["schemas"]["Output_BetaCitationContentBlockLocation"] | components["schemas"]["Output_BetaCitationsWebSearchResultLocation"] | components["schemas"]["Output_BetaCitationSearchResultLocation"];
            
            type: "citations_delta";
        } & {
            [key: string]: unknown;
        };
        Output_BetaCitationSearchResultLocation: {
            cited_text: string;
            end_block_index: number;
            search_result_index: number;
            source: string;
            start_block_index: number;
            title?: string | null;
            
            type: "search_result_location";
        } & {
            [key: string]: unknown;
        };
        Output_BetaCitationsWebSearchResultLocation: {
            cited_text: string;
            encrypted_index: string;
            title?: string | null;
            
            type: "web_search_result_location";
            url: string;
        } & {
            [key: string]: unknown;
        };
        Output_BetaClearThinking20251015EditResponse: {
            cleared_input_tokens: number;
            cleared_thinking_turns: number;
            
            type: "clear_thinking_20251015";
        } & {
            [key: string]: unknown;
        };
        Output_BetaClearToolUses20250919EditResponse: {
            cleared_input_tokens: number;
            cleared_tool_uses: number;
            
            type: "clear_tool_uses_20250919";
        } & {
            [key: string]: unknown;
        };
        Output_BetaCodeExecutionOutputBlock: {
            file_id: string;
            
            type: "code_execution_output";
        } & {
            [key: string]: unknown;
        };
        Output_BetaCodeExecutionResultBlock: {
            content: components["schemas"]["Output_BetaCodeExecutionOutputBlock"][];
            return_code: number;
            stderr: string;
            stdout: string;
            
            type: "code_execution_result";
        } & {
            [key: string]: unknown;
        };
        Output_BetaCodeExecutionTool20250522: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            
            name: "code_execution";
            strict?: boolean | null;
            
            type: "code_execution_20250522";
        } & {
            [key: string]: unknown;
        };
        Output_BetaCodeExecutionTool20250825: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            
            name: "code_execution";
            strict?: boolean | null;
            
            type: "code_execution_20250825";
        } & {
            [key: string]: unknown;
        };
        Output_BetaCodeExecutionTool20260120: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            
            name: "code_execution";
            strict?: boolean | null;
            
            type: "code_execution_20260120";
        } & {
            [key: string]: unknown;
        };
        Output_BetaCodeExecutionTool20260521: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            
            name: "code_execution";
            strict?: boolean | null;
            
            type: "code_execution_20260521";
        } & {
            [key: string]: unknown;
        };
        Output_BetaCodeExecutionToolResultBlock: {
            content: components["schemas"]["Output_BetaCodeExecutionToolResultError"] | components["schemas"]["Output_BetaCodeExecutionResultBlock"] | components["schemas"]["Output_BetaEncryptedCodeExecutionResultBlock"];
            tool_use_id: string;
            
            type: "code_execution_tool_result";
        } & {
            [key: string]: unknown;
        };
        Output_BetaCodeExecutionToolResultError: {
            
            error_code: "invalid_tool_input" | "unavailable" | "too_many_requests" | "execution_time_exceeded";
            
            type: "code_execution_tool_result_error";
        } & {
            [key: string]: unknown;
        };
        Output_BetaCompactionBlock: {
            content?: string | null;
            encrypted_content?: string | null;
            signature?: string | null;
            tool_changes?: (components["schemas"]["Output_BetaResponseToolAdditionBlock"] | components["schemas"]["Output_BetaResponseToolRemovalBlock"])[] | null;
            
            type: "compaction";
        } & {
            [key: string]: unknown;
        };
        Output_BetaCompactionContentBlockDelta: {
            content?: string | null;
            encrypted_content?: string | null;
            
            type: "compaction_delta";
        } & {
            [key: string]: unknown;
        };
        Output_BetaCompactionIterationUsage: {
            cache_creation?: components["schemas"]["Output_BetaCacheCreation"] | null;
            cache_creation_input_tokens: number;
            cache_read_input_tokens: number;
            input_tokens: number;
            output_tokens: number;
            
            type: "compaction";
        } & {
            [key: string]: unknown;
        };
        Output_BetaComputerCursorPositionConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaComputerDoubleClickConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaComputerHoldKeyConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaComputerKeyConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaComputerLeftClickConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaComputerLeftClickDragConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaComputerLeftMouseDownConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaComputerLeftMouseUpConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaComputerMiddleClickConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaComputerMouseMoveConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaComputerRightClickConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaComputerScreenshotConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaComputerScrollConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaComputerToolset20260801: {
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            configs?: components["schemas"]["Output_BetaComputerToolsetConfigs"] | null;
            
            type: "computer_toolset_20260801";
        } & {
            [key: string]: unknown;
        };
        Output_BetaComputerToolsetConfigs: {
            cursor_position?: components["schemas"]["Output_BetaComputerCursorPositionConfig"] | null;
            double_click?: components["schemas"]["Output_BetaComputerDoubleClickConfig"] | null;
            hold_key?: components["schemas"]["Output_BetaComputerHoldKeyConfig"] | null;
            key?: components["schemas"]["Output_BetaComputerKeyConfig"] | null;
            left_click?: components["schemas"]["Output_BetaComputerLeftClickConfig"] | null;
            left_click_drag?: components["schemas"]["Output_BetaComputerLeftClickDragConfig"] | null;
            left_mouse_down?: components["schemas"]["Output_BetaComputerLeftMouseDownConfig"] | null;
            left_mouse_up?: components["schemas"]["Output_BetaComputerLeftMouseUpConfig"] | null;
            middle_click?: components["schemas"]["Output_BetaComputerMiddleClickConfig"] | null;
            mouse_move?: components["schemas"]["Output_BetaComputerMouseMoveConfig"] | null;
            right_click?: components["schemas"]["Output_BetaComputerRightClickConfig"] | null;
            screenshot?: components["schemas"]["Output_BetaComputerScreenshotConfig"] | null;
            scroll?: components["schemas"]["Output_BetaComputerScrollConfig"] | null;
            triple_click?: components["schemas"]["Output_BetaComputerTripleClickConfig"] | null;
            type?: components["schemas"]["Output_BetaComputerTypeConfig"] | null;
            wait?: components["schemas"]["Output_BetaComputerWaitConfig"] | null;
            zoom?: components["schemas"]["Output_BetaComputerZoomConfig"] | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaComputerTripleClickConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaComputerTypeConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaComputerWaitConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaComputerZoomConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaContainer: {
            
            expires_at: string;
            id: string;
            skills?: components["schemas"]["Output_BetaContainerSkill"][] | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaContainerSkill: {
            skill_id: string;
            
            type: "anthropic" | "custom";
            version: string;
        } & {
            [key: string]: unknown;
        };
        Output_BetaContainerUploadBlock: {
            file_id: string;
            
            type: "container_upload";
        } & {
            [key: string]: unknown;
        };
        Output_BetaContextManagementResponse: {
            applied_edits: (components["schemas"]["Output_BetaClearToolUses20250919EditResponse"] | components["schemas"]["Output_BetaClearThinking20251015EditResponse"])[];
        } & {
            [key: string]: unknown;
        };
        Output_BetaDiagnostics: {
            cache_miss_reason?: components["schemas"]["Output_BetaCacheMissModelChanged"] | components["schemas"]["Output_BetaCacheMissSystemChanged"] | components["schemas"]["Output_BetaCacheMissToolsChanged"] | components["schemas"]["Output_BetaCacheMissMessagesChanged"] | components["schemas"]["Output_BetaCacheMissPreviousMessageNotFound"] | components["schemas"]["Output_BetaCacheMissUnavailable"] | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaDirectCaller: {
            
            type: "direct";
        } & {
            [key: string]: unknown;
        };
        Output_BetaDocumentBlock: {
            citations?: components["schemas"]["Output_BetaCitationConfig"] | null;
            source: components["schemas"]["Output_BetaBase64PDFSource"] | components["schemas"]["Output_BetaPlainTextSource"];
            title?: string | null;
            
            type: "document";
        } & {
            [key: string]: unknown;
        };
        Output_BetaEncryptedCodeExecutionResultBlock: {
            content: components["schemas"]["Output_BetaCodeExecutionOutputBlock"][];
            encrypted_stdout: string;
            return_code: number;
            stderr: string;
            
            type: "encrypted_code_execution_result";
        } & {
            [key: string]: unknown;
        };
        Output_BetaFallbackBlock: {
            from: components["schemas"]["Output_BetaFallbackInfo"];
            to: components["schemas"]["Output_BetaFallbackInfo"];
            trigger: components["schemas"]["Output_BetaFallbackRefusalTrigger"];
            
            type: "fallback";
        } & {
            [key: string]: unknown;
        };
        Output_BetaFallbackCreditNotApplied: {
            
            reason: "body_mismatch" | "continuation_excluded" | "continuation_only" | "expired" | "invalid_target_model" | "not_enabled" | "reprice_unavailable" | "temporarily_unavailable" | "variant_fields_present" | "wrong_organization" | "wrong_platform" | "wrong_workspace";
            remove_to_redeem?: string[] | null;
            
            type: "not_applied";
        } & {
            [key: string]: unknown;
        };
        Output_BetaFallbackCreditRedeemed: {
            
            type: "redeemed";
        } & {
            [key: string]: unknown;
        };
        Output_BetaFallbackCreditUsage: {
            status: components["schemas"]["Output_BetaFallbackCreditRedeemed"] | components["schemas"]["Output_BetaFallbackCreditNotApplied"];
        } & {
            [key: string]: unknown;
        };
        Output_BetaFallbackInfo: {
            model: ("claude-haiku-5-5" | "claude-sonnet-5-5" | "claude-fable-5-1" | "claude-opus-5-5" | "claude-mythos-5-1" | "claude-sonnet-5" | "claude-fable-5" | "claude-mythos-5" | "claude-opus-5" | "claude-opus-4-8" | "claude-opus-4-7" | "claude-mythos-preview" | "claude-opus-4-6" | "claude-sonnet-4-6" | "claude-haiku-4-5" | "claude-haiku-4-5-20251001" | "claude-opus-4-5" | "claude-opus-4-5-20251101" | "claude-sonnet-4-5" | "claude-sonnet-4-5-20250929") | string;
        } & {
            [key: string]: unknown;
        };
        Output_BetaFallbackMessageIterationUsage: {
            cache_creation?: components["schemas"]["Output_BetaCacheCreation"] | null;
            cache_creation_input_tokens: number;
            cache_read_input_tokens: number;
            input_tokens: number;
            model: ("claude-haiku-5-5" | "claude-sonnet-5-5" | "claude-fable-5-1" | "claude-opus-5-5" | "claude-mythos-5-1" | "claude-sonnet-5" | "claude-fable-5" | "claude-mythos-5" | "claude-opus-5" | "claude-opus-4-8" | "claude-opus-4-7" | "claude-mythos-preview" | "claude-opus-4-6" | "claude-sonnet-4-6" | "claude-haiku-4-5" | "claude-haiku-4-5-20251001" | "claude-opus-4-5" | "claude-opus-4-5-20251101" | "claude-sonnet-4-5" | "claude-sonnet-4-5-20250929") | string;
            output_tokens: number;
            
            type: "fallback_message";
        } & {
            [key: string]: unknown;
        };
        Output_BetaFallbackRefusalTrigger: {
            category?: ("cyber" | "bio" | "frontier_llm" | "reasoning_extraction" | "general_harms") | null;
            
            type: "refusal";
        } & {
            [key: string]: unknown;
        };
        Output_BetaInputJSONDelta: {
            partial_json: string;
            
            type: "input_json_delta";
        } & {
            [key: string]: unknown;
        };
        Output_BetaMCPTool: {
            description?: string | null;
            input_schema: {
                [key: string]: unknown;
            };
            name: string;
        } & {
            [key: string]: unknown;
        };
        Output_BetaMCPToolConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaMCPToolDefaultConfig: {
            defer_loading?: boolean | null;
            enabled?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaMCPToolListingBlock: {
            mcp_server_name: string;
            tools: components["schemas"]["Output_BetaMCPTool"][];
            
            type: "mcp_tool_listing";
        } & {
            [key: string]: unknown;
        };
        Output_BetaMCPToolParam: {
            description?: string | null;
            input_schema: {
                [key: string]: unknown;
            };
            name: string;
        } & {
            [key: string]: unknown;
        };
        Output_BetaMCPToolResultBlock: {
            content: string | components["schemas"]["Output_BetaTextBlock"][];
            is_error: boolean;
            tool_use_id: string;
            
            type: "mcp_tool_result";
        } & {
            [key: string]: unknown;
        };
        Output_BetaMCPToolset: {
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            configs?: {
                [key: string]: components["schemas"]["Output_BetaMCPToolConfig"];
            } | null;
            default_config?: components["schemas"]["Output_BetaMCPToolDefaultConfig"] | null;
            mcp_server_name: string;
            tools?: components["schemas"]["Output_BetaMCPToolParam"][] | null;
            
            type: "mcp_toolset";
        } & {
            [key: string]: unknown;
        };
        Output_BetaMCPToolUseBlock: {
            id: string;
            input: {
                [key: string]: unknown;
            };
            name: string;
            server_name: string;
            
            type: "mcp_tool_use";
        } & {
            [key: string]: unknown;
        };
        Output_BetaMemoryTool20250818: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            input_examples?: {
                [key: string]: unknown;
            }[] | null;
            
            name: "memory";
            strict?: boolean | null;
            
            type: "memory_20250818";
        } & {
            [key: string]: unknown;
        };
        Output_BetaMessage: {
            container?: components["schemas"]["Output_BetaContainer"] | null;
            content: (components["schemas"]["Output_BetaTextBlock"] | components["schemas"]["Output_BetaThinkingBlock"] | components["schemas"]["Output_BetaRedactedThinkingBlock"] | components["schemas"]["Output_BetaToolUseBlock"] | components["schemas"]["Output_BetaServerToolUseBlock"] | components["schemas"]["Output_BetaWebSearchToolResultBlock"] | components["schemas"]["Output_BetaWebFetchToolResultBlock"] | components["schemas"]["Output_BetaAdvisorToolResultBlock"] | components["schemas"]["Output_BetaCodeExecutionToolResultBlock"] | components["schemas"]["Output_BetaBashCodeExecutionToolResultBlock"] | components["schemas"]["Output_BetaTextEditorCodeExecutionToolResultBlock"] | components["schemas"]["Output_BetaToolSearchToolResultBlock"] | components["schemas"]["Output_BetaMCPToolUseBlock"] | components["schemas"]["Output_BetaMCPToolResultBlock"] | components["schemas"]["Output_BetaContainerUploadBlock"] | components["schemas"]["Output_BetaCompactionBlock"] | components["schemas"]["Output_BetaFallbackBlock"] | components["schemas"]["Output_BetaMCPToolListingBlock"])[];
            context_management?: components["schemas"]["Output_BetaContextManagementResponse"] | null;
            diagnostics?: components["schemas"]["Output_BetaDiagnostics"] | null;
            id: string;
            input_transformations?: (components["schemas"]["Output_BetaThinkingDroppedInputTransformation"] | components["schemas"]["Output_BetaThinkingMismatchAllowedInputTransformation"])[] | null;
            model: string;
            
            role: "assistant";
            stop_details?: components["schemas"]["Output_BetaRefusalStopDetails"] | null;
            stop_reason?: ("end_turn" | "max_tokens" | "stop_sequence" | "tool_use" | "pause_turn" | "compaction" | "refusal" | "model_context_window_exceeded") | null;
            stop_sequence?: string | null;
            
            type: "message";
            usage: components["schemas"]["Output_BetaUsage"];
        } & {
            [key: string]: unknown;
        };
        Output_BetaMessageDeltaUsage: {
            cache_creation_input_tokens?: number | null;
            cache_read_input_tokens?: number | null;
            fallback_credit?: components["schemas"]["Output_BetaFallbackCreditUsage"] | null;
            input_tokens?: number | null;
            iterations?: (components["schemas"]["Output_BetaMessageIterationUsage"] | components["schemas"]["Output_BetaCompactionIterationUsage"] | components["schemas"]["Output_BetaAdvisorMessageIterationUsage"] | components["schemas"]["Output_BetaFallbackMessageIterationUsage"])[] | null;
            output_tokens: number;
            output_tokens_details?: components["schemas"]["Output_BetaOutputTokensDetails"] | null;
            server_tool_use?: components["schemas"]["Output_BetaServerToolUsage"] | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaMessageIterationUsage: {
            cache_creation?: components["schemas"]["Output_BetaCacheCreation"] | null;
            cache_creation_input_tokens: number;
            cache_read_input_tokens: number;
            input_tokens: number;
            model?: ("claude-haiku-5-5" | "claude-sonnet-5-5" | "claude-fable-5-1" | "claude-opus-5-5" | "claude-mythos-5-1" | "claude-sonnet-5" | "claude-fable-5" | "claude-mythos-5" | "claude-opus-5" | "claude-opus-4-8" | "claude-opus-4-7" | "claude-mythos-preview" | "claude-opus-4-6" | "claude-sonnet-4-6" | "claude-haiku-4-5" | "claude-haiku-4-5-20251001" | "claude-opus-4-5" | "claude-opus-4-5-20251101" | "claude-sonnet-4-5" | "claude-sonnet-4-5-20250929") | string | null;
            output_tokens: number;
            
            type: "message";
        } & {
            [key: string]: unknown;
        };
        Output_BetaOutputTokensDetails: {
            thinking_tokens: number;
        } & {
            [key: string]: unknown;
        };
        Output_BetaPlainTextSource: {
            data: string;
            
            media_type: "text/plain";
            
            type: "text";
        } & {
            [key: string]: unknown;
        };
        Output_BetaRawContentBlockDeltaEvent: {
            delta: components["schemas"]["Output_BetaTextDelta"] | components["schemas"]["Output_BetaInputJSONDelta"] | components["schemas"]["Output_BetaCitationsDelta"] | components["schemas"]["Output_BetaThinkingDelta"] | components["schemas"]["Output_BetaSignatureDelta"] | components["schemas"]["Output_BetaCompactionContentBlockDelta"];
            index: number;
            
            type: "content_block_delta";
        } & {
            [key: string]: unknown;
        };
        Output_BetaRawContentBlockStartEvent: {
            content_block: components["schemas"]["Output_BetaTextBlock"] | components["schemas"]["Output_BetaThinkingBlock"] | components["schemas"]["Output_BetaRedactedThinkingBlock"] | components["schemas"]["Output_BetaToolUseBlock"] | components["schemas"]["Output_BetaServerToolUseBlock"] | components["schemas"]["Output_BetaWebSearchToolResultBlock"] | components["schemas"]["Output_BetaWebFetchToolResultBlock"] | components["schemas"]["Output_BetaAdvisorToolResultBlock"] | components["schemas"]["Output_BetaCodeExecutionToolResultBlock"] | components["schemas"]["Output_BetaBashCodeExecutionToolResultBlock"] | components["schemas"]["Output_BetaTextEditorCodeExecutionToolResultBlock"] | components["schemas"]["Output_BetaToolSearchToolResultBlock"] | components["schemas"]["Output_BetaMCPToolUseBlock"] | components["schemas"]["Output_BetaMCPToolResultBlock"] | components["schemas"]["Output_BetaContainerUploadBlock"] | components["schemas"]["Output_BetaCompactionBlock"] | components["schemas"]["Output_BetaFallbackBlock"] | components["schemas"]["Output_BetaMCPToolListingBlock"];
            index: number;
            
            type: "content_block_start";
        } & {
            [key: string]: unknown;
        };
        Output_BetaRawContentBlockStopEvent: {
            index: number;
            
            type: "content_block_stop";
        } & {
            [key: string]: unknown;
        };
        Output_BetaRawMessageDeltaEvent: {
            context_management?: components["schemas"]["Output_BetaContextManagementResponse"] | null;
            delta: components["schemas"]["Output_Delta"];
            input_transformations?: (components["schemas"]["Output_BetaThinkingDroppedInputTransformation"] | components["schemas"]["Output_BetaThinkingMismatchAllowedInputTransformation"])[] | null;
            
            type: "message_delta";
            usage: components["schemas"]["Output_BetaMessageDeltaUsage"];
        } & {
            [key: string]: unknown;
        };
        Output_BetaRawMessageStartEvent: {
            message: components["schemas"]["Output_BetaMessage"];
            
            type: "message_start";
        } & {
            [key: string]: unknown;
        };
        Output_BetaRawMessageStopEvent: {
            
            type: "message_stop";
        } & {
            [key: string]: unknown;
        };
        Output_BetaRedactedThinkingBlock: {
            data: string;
            
            type: "redacted_thinking";
        } & {
            [key: string]: unknown;
        };
        Output_BetaRefusalStopDetails: {
            category?: ("cyber" | "bio" | "frontier_llm" | "reasoning_extraction" | "general_harms") | null;
            explanation?: string | null;
            fallback_credit_token?: string | null;
            fallback_has_prefill_claim?: boolean | null;
            recommended_model?: string | null;
            
            type: "refusal";
        } & {
            [key: string]: unknown;
        };
        Output_BetaResponseTool: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            defer_loading?: boolean | null;
            description?: string | null;
            eager_input_streaming?: boolean | null;
            input_examples?: {
                [key: string]: unknown;
            }[] | null;
            input_schema: components["schemas"]["Output_BetaResponseToolInputSchema"];
            name: string;
            strict?: boolean | null;
            type?: "custom" | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaResponseToolAdditionBlock: {
            tool: components["schemas"]["Output_BetaResponseToolChangeToolReference"] | components["schemas"]["Output_BetaResponseToolChangeMCPToolReference"] | components["schemas"]["Output_BetaResponseToolChangeMCPToolsetReference"] | components["schemas"]["Output_BetaToolChangeToolDefinition"];
            
            type: "tool_addition";
        } & {
            [key: string]: unknown;
        };
        Output_BetaResponseToolChangeMCPToolReference: {
            name: string;
            server_name: string;
            
            type: "mcp_tool_reference";
        } & {
            [key: string]: unknown;
        };
        Output_BetaResponseToolChangeMCPToolsetReference: {
            server_name: string;
            
            type: "mcp_toolset_reference";
        } & {
            [key: string]: unknown;
        };
        Output_BetaResponseToolChangeToolReference: {
            name: string;
            
            type: "tool_reference";
        } & {
            [key: string]: unknown;
        };
        Output_BetaResponseToolInputSchema: {
            properties?: {
                [key: string]: unknown;
            } | null;
            required?: string[] | null;
            
            type: "object";
        } & {
            [key: string]: unknown;
        };
        Output_BetaResponseToolRemovalBlock: {
            tool: components["schemas"]["Output_BetaResponseToolChangeToolReference"] | components["schemas"]["Output_BetaResponseToolChangeMCPToolReference"] | components["schemas"]["Output_BetaResponseToolChangeMCPToolsetReference"];
            
            type: "tool_removal";
        } & {
            [key: string]: unknown;
        };
        Output_BetaServerToolCaller: {
            tool_id: string;
            
            type: "code_execution_20250825";
        } & {
            [key: string]: unknown;
        };
        Output_BetaServerToolCaller20260120: {
            tool_id: string;
            
            type: "code_execution_20260120";
        } & {
            [key: string]: unknown;
        };
        Output_BetaServerToolUsage: {
            web_fetch_requests: number;
            web_search_requests: number;
        } & {
            [key: string]: unknown;
        };
        Output_BetaServerToolUseBlock: {
            caller?: components["schemas"]["Output_BetaDirectCaller"] | components["schemas"]["Output_BetaServerToolCaller"] | components["schemas"]["Output_BetaServerToolCaller20260120"] | null;
            id: string;
            input: {
                [key: string]: unknown;
            };
            
            name: "advisor" | "web_search" | "web_fetch" | "code_execution" | "bash_code_execution" | "text_editor_code_execution" | "tool_search_tool_regex" | "tool_search_tool_bm25";
            
            type: "server_tool_use";
        } & {
            [key: string]: unknown;
        };
        Output_BetaSignatureDelta: {
            signature: string;
            
            type: "signature_delta";
        } & {
            [key: string]: unknown;
        };
        Output_BetaTextBlock: {
            citations?: (components["schemas"]["Output_BetaCitationCharLocation"] | components["schemas"]["Output_BetaCitationPageLocation"] | components["schemas"]["Output_BetaCitationContentBlockLocation"] | components["schemas"]["Output_BetaCitationsWebSearchResultLocation"] | components["schemas"]["Output_BetaCitationSearchResultLocation"])[] | null;
            text: string;
            
            type: "text";
        } & {
            [key: string]: unknown;
        };
        Output_BetaTextDelta: {
            text: string;
            
            type: "text_delta";
        } & {
            [key: string]: unknown;
        };
        Output_BetaTextEditorCodeExecutionCreateResultBlock: {
            is_file_update: boolean;
            
            type: "text_editor_code_execution_create_result";
        } & {
            [key: string]: unknown;
        };
        Output_BetaTextEditorCodeExecutionStrReplaceResultBlock: {
            lines?: string[] | null;
            new_lines?: number | null;
            new_start?: number | null;
            old_lines?: number | null;
            old_start?: number | null;
            
            type: "text_editor_code_execution_str_replace_result";
        } & {
            [key: string]: unknown;
        };
        Output_BetaTextEditorCodeExecutionToolResultBlock: {
            content: components["schemas"]["Output_BetaTextEditorCodeExecutionToolResultError"] | components["schemas"]["Output_BetaTextEditorCodeExecutionViewResultBlock"] | components["schemas"]["Output_BetaTextEditorCodeExecutionCreateResultBlock"] | components["schemas"]["Output_BetaTextEditorCodeExecutionStrReplaceResultBlock"];
            tool_use_id: string;
            
            type: "text_editor_code_execution_tool_result";
        } & {
            [key: string]: unknown;
        };
        Output_BetaTextEditorCodeExecutionToolResultError: {
            
            error_code: "invalid_tool_input" | "unavailable" | "too_many_requests" | "execution_time_exceeded" | "file_not_found";
            error_message?: string | null;
            
            type: "text_editor_code_execution_tool_result_error";
        } & {
            [key: string]: unknown;
        };
        Output_BetaTextEditorCodeExecutionViewResultBlock: {
            content: string;
            
            file_type: "text" | "image" | "pdf";
            num_lines?: number | null;
            start_line?: number | null;
            total_lines?: number | null;
            
            type: "text_editor_code_execution_view_result";
        } & {
            [key: string]: unknown;
        };
        Output_BetaThinkingBlock: {
            signature: string;
            thinking: string;
            
            type: "thinking";
        } & {
            [key: string]: unknown;
        };
        Output_BetaThinkingDelta: {
            estimated_tokens?: number | null;
            thinking: string;
            
            type: "thinking_delta";
        } & {
            [key: string]: unknown;
        };
        Output_BetaThinkingDroppedInputTransformation: {
            path: string;
            
            reason: "model_binding_mismatch" | "prefix_binding_mismatch" | "organization_binding_mismatch" | "end_user_binding_mismatch";
            
            type: "thinking_dropped";
        } & {
            [key: string]: unknown;
        };
        Output_BetaThinkingMismatchAllowedInputTransformation: {
            path: string;
            
            reason: "model_binding_mismatch" | "prefix_binding_mismatch" | "organization_binding_mismatch" | "end_user_binding_mismatch";
            
            type: "thinking_mismatch_allowed";
        } & {
            [key: string]: unknown;
        };
        Output_BetaToolBash20241022: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            input_examples?: {
                [key: string]: unknown;
            }[] | null;
            
            name: "bash";
            strict?: boolean | null;
            
            type: "bash_20241022";
        } & {
            [key: string]: unknown;
        };
        Output_BetaToolBash20250124: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            input_examples?: {
                [key: string]: unknown;
            }[] | null;
            
            name: "bash";
            strict?: boolean | null;
            
            type: "bash_20250124";
        } & {
            [key: string]: unknown;
        };
        Output_BetaToolChangeToolDefinition: {
            definition: components["schemas"]["Output_BetaResponseTool"] | components["schemas"]["Output_BetaToolBash20241022"] | components["schemas"]["Output_BetaToolBash20250124"] | components["schemas"]["Output_BetaCodeExecutionTool20250522"] | components["schemas"]["Output_BetaCodeExecutionTool20250825"] | components["schemas"]["Output_BetaCodeExecutionTool20260120"] | components["schemas"]["Output_BetaCodeExecutionTool20260521"] | components["schemas"]["Output_BetaBrowserToolset20260801"] | components["schemas"]["Output_BetaToolComputerUse20241022"] | components["schemas"]["Output_BetaMemoryTool20250818"] | components["schemas"]["Output_BetaToolComputerUse20250124"] | components["schemas"]["Output_BetaToolTextEditor20241022"] | components["schemas"]["Output_BetaToolComputerUse20251124"] | components["schemas"]["Output_BetaComputerToolset20260801"] | components["schemas"]["Output_BetaToolTextEditor20250124"] | components["schemas"]["Output_BetaToolTextEditor20250429"] | components["schemas"]["Output_BetaToolTextEditor20250728"] | components["schemas"]["Output_BetaWebSearchTool20250305"] | components["schemas"]["Output_BetaWebFetchTool20250910"] | components["schemas"]["Output_BetaWebSearchTool20260209"] | components["schemas"]["Output_BetaWebFetchTool20260209"] | components["schemas"]["Output_BetaWebFetchTool20260309"] | components["schemas"]["Output_BetaWebSearchTool20260318"] | components["schemas"]["Output_BetaWebFetchTool20260318"] | components["schemas"]["Output_BetaAdvisorTool20260301"] | components["schemas"]["Output_BetaToolSearchToolBm25_20251119"] | components["schemas"]["Output_BetaToolSearchToolRegex20251119"] | components["schemas"]["Output_BetaMCPToolset"];
            
            type: "tool_definition";
        } & {
            [key: string]: unknown;
        };
        Output_BetaToolComputerUse20241022: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            display_height_px: number;
            display_number?: number | null;
            display_width_px: number;
            input_examples?: {
                [key: string]: unknown;
            }[] | null;
            
            name: "computer";
            strict?: boolean | null;
            
            type: "computer_20241022";
        } & {
            [key: string]: unknown;
        };
        Output_BetaToolComputerUse20250124: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            display_height_px: number;
            display_number?: number | null;
            display_width_px: number;
            input_examples?: {
                [key: string]: unknown;
            }[] | null;
            
            name: "computer";
            strict?: boolean | null;
            
            type: "computer_20250124";
        } & {
            [key: string]: unknown;
        };
        Output_BetaToolComputerUse20251124: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            display_height_px: number;
            display_number?: number | null;
            display_width_px: number;
            enable_zoom?: boolean | null;
            input_examples?: {
                [key: string]: unknown;
            }[] | null;
            
            name: "computer";
            strict?: boolean | null;
            
            type: "computer_20251124";
        } & {
            [key: string]: unknown;
        };
        Output_BetaToolReferenceBlock: {
            tool_name: string;
            
            type: "tool_reference";
        } & {
            [key: string]: unknown;
        };
        Output_BetaToolSearchToolBm25_20251119: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            
            name: "tool_search_tool_bm25";
            strict?: boolean | null;
            
            type: "tool_search_tool_bm25_20251119" | "tool_search_tool_bm25";
        } & {
            [key: string]: unknown;
        };
        Output_BetaToolSearchToolRegex20251119: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            
            name: "tool_search_tool_regex";
            strict?: boolean | null;
            
            type: "tool_search_tool_regex_20251119" | "tool_search_tool_regex";
        } & {
            [key: string]: unknown;
        };
        Output_BetaToolSearchToolResultBlock: {
            content: components["schemas"]["Output_BetaToolSearchToolResultError"] | components["schemas"]["Output_BetaToolSearchToolSearchResultBlock"];
            tool_use_id: string;
            
            type: "tool_search_tool_result";
        } & {
            [key: string]: unknown;
        };
        Output_BetaToolSearchToolResultError: {
            
            error_code: "invalid_tool_input" | "unavailable" | "too_many_requests" | "execution_time_exceeded";
            error_message?: string | null;
            
            type: "tool_search_tool_result_error";
        } & {
            [key: string]: unknown;
        };
        Output_BetaToolSearchToolSearchResultBlock: {
            tool_references: components["schemas"]["Output_BetaToolReferenceBlock"][];
            
            type: "tool_search_tool_search_result";
        } & {
            [key: string]: unknown;
        };
        Output_BetaToolTextEditor20241022: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            input_examples?: {
                [key: string]: unknown;
            }[] | null;
            
            name: "str_replace_editor";
            strict?: boolean | null;
            
            type: "text_editor_20241022";
        } & {
            [key: string]: unknown;
        };
        Output_BetaToolTextEditor20250124: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            input_examples?: {
                [key: string]: unknown;
            }[] | null;
            
            name: "str_replace_editor";
            strict?: boolean | null;
            
            type: "text_editor_20250124";
        } & {
            [key: string]: unknown;
        };
        Output_BetaToolTextEditor20250429: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            input_examples?: {
                [key: string]: unknown;
            }[] | null;
            
            name: "str_replace_based_edit_tool";
            strict?: boolean | null;
            
            type: "text_editor_20250429";
        } & {
            [key: string]: unknown;
        };
        Output_BetaToolTextEditor20250728: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            input_examples?: {
                [key: string]: unknown;
            }[] | null;
            max_characters?: number | null;
            
            name: "str_replace_based_edit_tool";
            strict?: boolean | null;
            
            type: "text_editor_20250728";
        } & {
            [key: string]: unknown;
        };
        Output_BetaToolUseBlock: {
            caller?: components["schemas"]["Output_BetaDirectCaller"] | components["schemas"]["Output_BetaServerToolCaller"] | components["schemas"]["Output_BetaServerToolCaller20260120"] | null;
            id: string;
            input: {
                [key: string]: unknown;
            };
            name: string;
            toolset_name?: string | null;
            
            type: "tool_use";
        } & {
            [key: string]: unknown;
        };
        Output_BetaUsage: {
            cache_creation?: components["schemas"]["Output_BetaCacheCreation"] | null;
            cache_creation_input_tokens?: number | null;
            cache_read_input_tokens?: number | null;
            fallback_credit?: components["schemas"]["Output_BetaFallbackCreditUsage"] | null;
            inference_geo?: string | null;
            input_tokens: number;
            iterations?: (components["schemas"]["Output_BetaMessageIterationUsage"] | components["schemas"]["Output_BetaCompactionIterationUsage"] | components["schemas"]["Output_BetaAdvisorMessageIterationUsage"] | components["schemas"]["Output_BetaFallbackMessageIterationUsage"])[] | null;
            output_tokens: number;
            output_tokens_details?: components["schemas"]["Output_BetaOutputTokensDetails"] | null;
            server_tool_use?: components["schemas"]["Output_BetaServerToolUsage"] | null;
            service_tier?: ("standard" | "priority" | "batch") | null;
            speed?: ("standard" | "fast") | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaUserLocation: {
            city?: string | null;
            country?: string | null;
            region?: string | null;
            timezone?: string | null;
            
            type: "approximate";
        } & {
            [key: string]: unknown;
        };
        Output_BetaWebFetchBlock: {
            content: components["schemas"]["Output_BetaDocumentBlock"];
            retrieved_at?: string | null;
            
            type: "web_fetch_result";
            url: string;
        } & {
            [key: string]: unknown;
        };
        Output_BetaWebFetchTool20250910: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            allowed_domains?: string[] | null;
            blocked_domains?: string[] | null;
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            citations?: components["schemas"]["Output_BetaCitationsConfigParam"] | null;
            defer_loading?: boolean | null;
            max_content_tokens?: number | null;
            max_uses?: number | null;
            
            name: "web_fetch";
            strict?: boolean | null;
            
            type: "web_fetch_20250910";
            url_sources?: components["schemas"]["Output_BetaWebFetchURLSources"] | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaWebFetchTool20260209: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            allowed_domains?: string[] | null;
            blocked_domains?: string[] | null;
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            citations?: components["schemas"]["Output_BetaCitationsConfigParam"] | null;
            defer_loading?: boolean | null;
            max_content_tokens?: number | null;
            max_uses?: number | null;
            
            name: "web_fetch";
            strict?: boolean | null;
            
            type: "web_fetch_20260209";
            url_sources?: components["schemas"]["Output_BetaWebFetchURLSources"] | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaWebFetchTool20260309: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            allowed_domains?: string[] | null;
            blocked_domains?: string[] | null;
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            citations?: components["schemas"]["Output_BetaCitationsConfigParam"] | null;
            defer_loading?: boolean | null;
            max_content_tokens?: number | null;
            max_uses?: number | null;
            
            name: "web_fetch";
            strict?: boolean | null;
            
            type: "web_fetch_20260309";
            url_sources?: components["schemas"]["Output_BetaWebFetchURLSources"] | null;
            use_cache?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaWebFetchTool20260318: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            allowed_domains?: string[] | null;
            blocked_domains?: string[] | null;
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            citations?: components["schemas"]["Output_BetaCitationsConfigParam"] | null;
            defer_loading?: boolean | null;
            max_content_tokens?: number | null;
            max_uses?: number | null;
            
            name: "web_fetch";
            response_inclusion?: ("full" | "excluded") | null;
            strict?: boolean | null;
            
            type: "web_fetch_20260318";
            url_sources?: components["schemas"]["Output_BetaWebFetchURLSources"] | null;
            use_cache?: boolean | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaWebFetchToolResultBlock: {
            caller?: components["schemas"]["Output_BetaDirectCaller"] | components["schemas"]["Output_BetaServerToolCaller"] | components["schemas"]["Output_BetaServerToolCaller20260120"] | null;
            content: components["schemas"]["Output_BetaWebFetchToolResultErrorBlock"] | components["schemas"]["Output_BetaWebFetchBlock"];
            tool_use_id: string;
            
            type: "web_fetch_tool_result";
        } & {
            [key: string]: unknown;
        };
        Output_BetaWebFetchToolResultErrorBlock: {
            
            error_code: "invalid_tool_input" | "url_too_long" | "url_not_allowed" | "url_not_in_prior_context" | "url_not_accessible" | "unsupported_content_type" | "too_many_requests" | "max_uses_exceeded" | "unavailable" | "content_too_large";
            
            type: "web_fetch_tool_result_error";
        } & {
            [key: string]: unknown;
        };
        Output_BetaWebFetchURLSourceAll: {
            
            type: "all";
        } & {
            [key: string]: unknown;
        };
        Output_BetaWebFetchURLSourceExcept: {
            tools: components["schemas"]["Output_BetaWebFetchURLSourceToolReference"][];
            
            type: "except";
        } & {
            [key: string]: unknown;
        };
        Output_BetaWebFetchURLSourceNone: {
            
            type: "none";
        } & {
            [key: string]: unknown;
        };
        Output_BetaWebFetchURLSourceOnly: {
            tools: components["schemas"]["Output_BetaWebFetchURLSourceToolReference"][];
            
            type: "only";
        } & {
            [key: string]: unknown;
        };
        Output_BetaWebFetchURLSources: {
            client_tool_results?: components["schemas"]["Output_BetaWebFetchURLSourceAll"] | components["schemas"]["Output_BetaWebFetchURLSourceNone"] | components["schemas"]["Output_BetaWebFetchURLSourceOnly"] | components["schemas"]["Output_BetaWebFetchURLSourceExcept"] | null;
            server_tool_results?: components["schemas"]["Output_BetaWebFetchURLSourceAll"] | components["schemas"]["Output_BetaWebFetchURLSourceNone"] | components["schemas"]["Output_BetaWebFetchURLSourceOnly"] | components["schemas"]["Output_BetaWebFetchURLSourceExcept"] | null;
            user_input?: components["schemas"]["Output_BetaWebFetchURLSourceAll"] | components["schemas"]["Output_BetaWebFetchURLSourceNone"] | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaWebFetchURLSourceToolReference: {
            name: string;
            
            type: "tool_reference";
        } & {
            [key: string]: unknown;
        };
        Output_BetaWebSearchResultBlock: {
            encrypted_content: string;
            page_age?: string | null;
            title: string;
            
            type: "web_search_result";
            url: string;
        } & {
            [key: string]: unknown;
        };
        Output_BetaWebSearchTool20250305: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            allowed_domains?: string[] | null;
            blocked_domains?: string[] | null;
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            max_uses?: number | null;
            
            name: "web_search";
            strict?: boolean | null;
            
            type: "web_search_20250305";
            user_location?: components["schemas"]["Output_BetaUserLocation"] | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaWebSearchTool20260209: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            allowed_domains?: string[] | null;
            blocked_domains?: string[] | null;
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            max_uses?: number | null;
            
            name: "web_search";
            strict?: boolean | null;
            
            type: "web_search_20260209";
            user_location?: components["schemas"]["Output_BetaUserLocation"] | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaWebSearchTool20260318: {
            allowed_callers?: ("direct" | "code_execution_20250825" | "code_execution_20260120" | "code_execution_20260521")[] | null;
            allowed_domains?: string[] | null;
            blocked_domains?: string[] | null;
            cache_control?: components["schemas"]["Output_BetaCacheControlEphemeral"] | null;
            defer_loading?: boolean | null;
            max_uses?: number | null;
            
            name: "web_search";
            response_inclusion?: ("full" | "excluded") | null;
            strict?: boolean | null;
            
            type: "web_search_20260318";
            user_location?: components["schemas"]["Output_BetaUserLocation"] | null;
        } & {
            [key: string]: unknown;
        };
        Output_BetaWebSearchToolResultBlock: {
            caller?: components["schemas"]["Output_BetaDirectCaller"] | components["schemas"]["Output_BetaServerToolCaller"] | components["schemas"]["Output_BetaServerToolCaller20260120"] | null;
            content: components["schemas"]["Output_BetaWebSearchToolResultError"] | components["schemas"]["Output_BetaWebSearchResultBlock"][];
            tool_use_id: string;
            
            type: "web_search_tool_result";
        } & {
            [key: string]: unknown;
        };
        Output_BetaWebSearchToolResultError: {
            
            error_code: "invalid_tool_input" | "unavailable" | "max_uses_exceeded" | "too_many_requests" | "query_too_long" | "request_too_large";
            
            type: "web_search_tool_result_error";
        } & {
            [key: string]: unknown;
        };
        Output_Delta: {
            container?: components["schemas"]["Output_BetaContainer"] | null;
            stop_details?: components["schemas"]["Output_BetaRefusalStopDetails"] | null;
            stop_reason?: ("end_turn" | "max_tokens" | "stop_sequence" | "tool_use" | "pause_turn" | "compaction" | "refusal" | "model_context_window_exceeded") | null;
            stop_sequence?: string | null;
        } & {
            [key: string]: unknown;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;

}
/* The MIT License

Copyright (c) OpenAI (https://openai.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
 */
declare namespace ModelContract_7ff6a9f995dcaa1c {
export type paths = Record<string, never>;
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        
        ChatCompletionAllowedTools: {
            
            mode: "auto" | "required";
            tools: {
                [key: string]: unknown;
            }[];
        };
        
        ChatCompletionAllowedToolsChoice: {
            allowed_tools: components["schemas"]["ChatCompletionAllowedTools"];
            
            type: "allowed_tools";
        };
        ChatCompletionFunctionCallOption: {
            name: string;
        };
        
        ChatCompletionFunctions: {
            name: string;
            parameters?: components["schemas"]["FunctionParameters"];
        };
        
        ChatCompletionMessageCustomToolCall: {
            custom: {
                input: string;
                name: string;
            };
            id: string;
            
            type: "custom";
        };
        
        ChatCompletionMessageToolCall: {
            function: {
                arguments: string;
                name: string;
            };
            id: string;
            
            type: "function";
        };
        ChatCompletionMessageToolCalls: (components["schemas"]["ChatCompletionMessageToolCall"] | components["schemas"]["ChatCompletionMessageCustomToolCall"])[];
        
        ChatCompletionNamedToolChoice: {
            function: {
                name: string;
            };
            
            type: "function";
        };
        
        ChatCompletionNamedToolChoiceCustom: {
            custom: {
                name: string;
            };
            
            type: "custom";
        };
        
        ChatCompletionRequestAssistantMessage: {
            audio?: {
                id: string;
            } | null;
            content?: (string | components["schemas"]["ChatCompletionRequestAssistantMessageContentPart"][]) | null;
            function_call?: {
                arguments: string;
                name: string;
            } | null;
            name?: string;
            refusal?: string | null;
            
            role: "assistant";
            tool_calls?: components["schemas"]["ChatCompletionMessageToolCalls"];
        };
        ChatCompletionRequestAssistantMessageContentPart: components["schemas"]["ChatCompletionRequestMessageContentPartText"] | components["schemas"]["ChatCompletionRequestMessageContentPartRefusal"];
        
        ChatCompletionRequestDeveloperMessage: {
            content: string | components["schemas"]["ChatCompletionRequestMessageContentPartText"][];
            name?: string;
            
            role: "developer";
        };
        
        ChatCompletionRequestFunctionMessage: {
            content: string | null;
            name: string;
            
            role: "function";
        };
        ChatCompletionRequestMessage: components["schemas"]["ChatCompletionRequestDeveloperMessage"] | components["schemas"]["ChatCompletionRequestSystemMessage"] | components["schemas"]["ChatCompletionRequestUserMessage"] | components["schemas"]["ChatCompletionRequestAssistantMessage"] | components["schemas"]["ChatCompletionRequestToolMessage"] | components["schemas"]["ChatCompletionRequestFunctionMessage"];
        
        ChatCompletionRequestMessageContentPartAudio: {
            input_audio: {
                data: string;
                
                format: "wav" | "mp3";
            };
            prompt_cache_breakpoint?: components["schemas"]["PromptCacheBreakpointParam"];
            
            type: "input_audio";
        };
        
        ChatCompletionRequestMessageContentPartFile: {
            file: {
                file_data?: string;
                file_id?: string;
                filename?: string;
            };
            prompt_cache_breakpoint?: components["schemas"]["PromptCacheBreakpointParam"];
            
            type: "file";
        };
        
        ChatCompletionRequestMessageContentPartImage: {
            image_url: {
                
                detail?: "auto" | "low" | "high" | "original";
                
                url: string;
            };
            prompt_cache_breakpoint?: components["schemas"]["PromptCacheBreakpointParam"];
            
            type: "image_url";
        };
        
        ChatCompletionRequestMessageContentPartRefusal: {
            refusal: string;
            
            type: "refusal";
        };
        
        ChatCompletionRequestMessageContentPartText: {
            prompt_cache_breakpoint?: components["schemas"]["PromptCacheBreakpointParam"];
            text: string;
            
            type: "text";
        };
        
        ChatCompletionRequestMessageContentPartVideo: {
            
            type: "video_url";
            video_url: {
                
                url: string;
            };
        };
        
        ChatCompletionRequestSystemMessage: {
            content: string | components["schemas"]["ChatCompletionRequestSystemMessageContentPart"][];
            name?: string;
            
            role: "system";
        };
        ChatCompletionRequestSystemMessageContentPart: components["schemas"]["ChatCompletionRequestMessageContentPartText"];
        
        ChatCompletionRequestToolMessage: {
            content: string | components["schemas"]["ChatCompletionRequestToolMessageContentPart"][];
            
            role: "tool";
            tool_call_id: string;
        };
        ChatCompletionRequestToolMessageContentPart: components["schemas"]["ChatCompletionRequestMessageContentPartText"];
        
        ChatCompletionRequestUserMessage: {
            content: string | components["schemas"]["ChatCompletionRequestUserMessageContentPart"][];
            name?: string;
            
            role: "user";
        };
        ChatCompletionRequestUserMessageContentPart: components["schemas"]["ChatCompletionRequestMessageContentPartText"] | components["schemas"]["ChatCompletionRequestMessageContentPartImage"] | components["schemas"]["ChatCompletionRequestMessageContentPartAudio"] | components["schemas"]["ChatCompletionRequestMessageContentPartFile"] | components["schemas"]["ChatCompletionRequestMessageContentPartVideo"];
        ChatCompletionStreamOptions: {
            include_obfuscation?: boolean;
            include_usage?: boolean;
        } | null;
        
        ChatCompletionTool: {
            function: components["schemas"]["FunctionObject"];
            
            type: "function";
        };
        ChatCompletionToolChoiceOption: ("none" | "auto" | "required") | components["schemas"]["ChatCompletionAllowedToolsChoice"] | components["schemas"]["ChatCompletionNamedToolChoice"] | components["schemas"]["ChatCompletionNamedToolChoiceCustom"];
        ChatEvent: components["schemas"]["Output_CreateChatCompletionStreamResponse"] | components["schemas"]["GatewayErrorResponse"];
        ChatRequest: {
            audio?: never;
            frequency_penalty?: number | null;
            
            function_call?: ("none" | "auto") | components["schemas"]["ChatCompletionFunctionCallOption"];
            
            functions?: components["schemas"]["ChatCompletionFunctions"][];
            logit_bias?: {
                [key: string]: number;
            } | null;
            logprobs?: boolean | null;
            max_completion_tokens?: number | null;
            max_tokens?: number | null;
            messages: components["schemas"]["ChatCompletionRequestMessage"][];
            metadata?: components["schemas"]["Metadata"];
            modalities?: "text"[] | null;
            
            model: "google/gemini-4-argon";
            moderation?: components["schemas"]["ModerationParam"] | null;
            n?: number | null;
            parallel_tool_calls?: components["schemas"]["ParallelToolCalls"];
            prediction?: components["schemas"]["PredictionContent"] | null;
            presence_penalty?: number | null;
            prompt_cache_key?: string | null;
            prompt_cache_options?: components["schemas"]["PromptCacheOptionsParam"];
            reasoning_effort?: components["schemas"]["ReasoningEffort"];
            response_format?: components["schemas"]["ResponseFormatText"] | components["schemas"]["ResponseFormatJsonSchema"] | components["schemas"]["ResponseFormatJsonObject"];
            safety_identifier?: string | null;
            seed?: number | null;
            service_tier?: components["schemas"]["ServiceTier"];
            stop?: components["schemas"]["StopConfiguration"];
            stream?: boolean | null;
            stream_options?: components["schemas"]["ChatCompletionStreamOptions"];
            temperature?: number | null;
            tool_choice?: components["schemas"]["ChatCompletionToolChoiceOption"];
            tools?: (components["schemas"]["ChatCompletionTool"] | components["schemas"]["CustomToolChatCompletions"])[];
            top_logprobs?: number | null;
            top_p?: number | null;
            
            user?: string | null;
            verbosity?: components["schemas"]["Verbosity"];
            
            web_search_options?: {
                search_context_size?: components["schemas"]["WebSearchContextSize"];
                user_location?: {
                    approximate: components["schemas"]["WebSearchLocation"];
                    
                    type: "approximate";
                } | null;
            };
        };
        ChatResponse: components["schemas"]["Output_CreateChatCompletionResponse"];
        
        CustomToolChatCompletions: {
            
            custom: {
                format?: {
                    
                    type: "text";
                } | {
                    
                    grammar: {
                        definition: string;
                        
                        syntax: "lark" | "regex";
                    };
                    
                    type: "grammar";
                };
                name: string;
            };
            
            type: "custom";
        };
        FunctionObject: {
            name: string;
            parameters?: components["schemas"]["FunctionParameters"];
            strict?: boolean | null;
        };
        FunctionParameters: {
            [key: string]: unknown;
        };
        GatewayErrorResponse: {
            error: {
                code?: string | null;
                message: string;
                metadata?: {
                    provider_name?: unknown;
                    raw?: unknown;
                };
                param?: unknown;
                type?: string;
            };
            usage?: {
                [key: string]: unknown;
            };
        };
        Metadata: {
            [key: string]: string;
        } | null;
        ModerationConfigParam: {
            mode: components["schemas"]["ModerationMode"];
        };
        
        ModerationMode: "score" | "block";
        ModerationParam: {
            model: string;
            policy?: components["schemas"]["ModerationPolicyParam"] | null;
        };
        ModerationPolicyParam: {
            input?: components["schemas"]["ModerationConfigParam"] | null;
            output?: components["schemas"]["ModerationConfigParam"] | null;
        };
        
        Output_ChatCompletionMessageCustomToolCall: {
            custom: {
                input: string;
                name: string;
            };
            id: string;
            
            type: "custom";
        };
        
        Output_ChatCompletionMessageToolCall: {
            function: {
                arguments: string;
                name: string;
            };
            id: string;
            
            type: "function";
        };
        Output_ChatCompletionMessageToolCallChunk: {
            function?: {
                arguments?: string;
                name?: string;
            };
            id?: string;
            index: number;
            
            type?: "function";
        };
        Output_ChatCompletionMessageToolCalls: (components["schemas"]["Output_ChatCompletionMessageToolCall"] | components["schemas"]["Output_ChatCompletionMessageCustomToolCall"])[];
        Output_ChatCompletionModeration: {
            input: components["schemas"]["Output_ChatCompletionModerationResults"] | components["schemas"]["Output_ChatCompletionModerationError"];
            output: components["schemas"]["Output_ChatCompletionModerationResults"] | components["schemas"]["Output_ChatCompletionModerationError"];
        };
        Output_ChatCompletionModerationError: {
            code: string;
            message: string;
            
            type: "error";
        };
        Output_ChatCompletionModerationResults: {
            model: string;
            results: components["schemas"]["Output_ModerationResultBody"][];
            
            type: "moderation_results";
        };
        Output_ChatCompletionResponseMessage: {
            annotations?: {
                
                type: "url_citation";
                url_citation: {
                    end_index: number;
                    start_index: number;
                    title: string;
                    
                    url: string;
                };
            }[];
            audio?: {
                data: string;
                
                expires_at: number;
                id: string;
                transcript: string;
            } | null;
            content: string | null;
            
            function_call?: {
                arguments: string;
                name: string;
            } | null;
            images?: {
                image_url: {
                    url: string;
                };
                
                type: "image_url";
            }[];
            reasoning?: string | null;
            reasoning_details?: {
                data?: string;
                format?: string;
                id?: string;
                index: number;
                signature?: string;
                text?: string;
                type: string;
            }[];
            refusal?: string | null;
            
            role: "assistant";
            tool_calls?: components["schemas"]["Output_ChatCompletionMessageToolCalls"] | null;
        };
        Output_ChatCompletionStreamResponseDelta: {
            content?: string | null;
            
            function_call?: {
                arguments?: string;
                name?: string;
            };
            images?: {
                image_url: {
                    url: string;
                };
                
                type: "image_url";
            }[];
            reasoning?: string | null;
            reasoning_details?: {
                data?: string;
                format?: string;
                id?: string;
                index: number;
                signature?: string;
                text?: string;
                type: string;
            }[];
            refusal?: string | null;
            
            role?: "developer" | "system" | "user" | "assistant" | "tool";
            tool_calls?: components["schemas"]["Output_ChatCompletionMessageToolCallChunk"][];
        };
        Output_ChatCompletionTokenLogprob: {
            bytes: number[] | null;
            logprob: number;
            token: string;
            top_logprobs: {
                bytes: number[] | null;
                logprob: number;
                token: string;
            }[];
        };
        Output_CompletionUsage: {
            
            completion_tokens: number;
            completion_tokens_details?: {
                
                accepted_prediction_tokens?: number;
                
                audio_tokens?: number;
                image_tokens?: number;
                
                reasoning_tokens?: number;
                
                rejected_prediction_tokens?: number;
                text_tokens?: number;
            };
            
            prompt_tokens: number;
            prompt_tokens_details?: {
                
                audio_tokens?: number;
                
                cache_write_tokens?: number;
                
                cached_tokens?: number;
                image_tokens?: number;
                text_tokens?: number;
                video_tokens?: number;
            };
            
            total_tokens: number;
        };
        Output_CreateChatCompletionResponse: {
            choices: {
                
                finish_reason: "stop" | "length" | "tool_calls" | "content_filter" | "function_call" | "no_content" | "error";
                index: number;
                logprobs?: {
                    content: components["schemas"]["Output_ChatCompletionTokenLogprob"][] | null;
                    refusal: components["schemas"]["Output_ChatCompletionTokenLogprob"][] | null;
                } | null;
                message: components["schemas"]["Output_ChatCompletionResponseMessage"];
                native_finish_reason?: string | null;
            }[];
            
            created: number;
            id: string;
            metadata?: components["schemas"]["Output_Metadata"];
            model: string;
            moderation?: components["schemas"]["Output_ChatCompletionModeration"] | null;
            
            object: "chat.completion";
            service_tier?: components["schemas"]["Output_ServiceTier"];
            
            system_fingerprint?: string | null;
            usage?: components["schemas"]["Output_CompletionUsage"];
        };
        Output_CreateChatCompletionStreamResponse: {
            choices: {
                delta: components["schemas"]["Output_ChatCompletionStreamResponseDelta"];
                
                finish_reason: "stop" | "length" | "tool_calls" | "content_filter" | "function_call" | null | "no_content" | "error";
                index: number;
                logprobs?: {
                    content: components["schemas"]["Output_ChatCompletionTokenLogprob"][] | null;
                    refusal: components["schemas"]["Output_ChatCompletionTokenLogprob"][] | null;
                } | null;
                native_finish_reason?: string | null;
            }[];
            
            created: number;
            id: string;
            model: string;
            moderation?: components["schemas"]["Output_ChatCompletionModeration"] | null;
            obfuscation?: string;
            
            object: "chat.completion.chunk";
            service_tier?: components["schemas"]["Output_ServiceTier"];
            
            system_fingerprint?: string | null;
            usage?: components["schemas"]["Output_CompletionUsage"] | null;
        };
        Output_Metadata: {
            [key: string]: string;
        } | null;
        
        Output_ModerationInputType: "text" | "image";
        
        Output_ModerationResultBody: {
            categories: {
                [key: string]: boolean;
            };
            category_applied_input_types: {
                [key: string]: components["schemas"]["Output_ModerationInputType"][];
            };
            category_scores: {
                [key: string]: number;
            };
            flagged: boolean;
            model: string;
            
            type: "moderation_result";
        };
        Output_ServiceTier: ("auto" | "default" | "flex" | "scale" | "priority" | "fast") | null;
        
        ParallelToolCalls: boolean;
        
        PredictionContent: {
            content: string | components["schemas"]["ChatCompletionRequestMessageContentPartText"][];
            
            type: "content";
        };
        
        PromptCacheBreakpointParam: {
            
            mode: "explicit";
        };
        
        PromptCacheModeEnum: "implicit" | "explicit";
        
        PromptCacheOptionsParam: {
            mode?: components["schemas"]["PromptCacheModeEnum"];
            ttl?: components["schemas"]["PromptCacheTTLEnum"];
        };
        
        PromptCacheTTLEnum: "30m";
        ReasoningEffort: ("none" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max") | null;
        
        ResponseFormatJsonObject: {
            
            type: "json_object";
        };
        
        ResponseFormatJsonSchema: {
            
            json_schema: {
                name: string;
                schema?: components["schemas"]["ResponseFormatJsonSchemaSchema"];
                strict?: boolean | null;
            };
            
            type: "json_schema";
        };
        
        ResponseFormatJsonSchemaSchema: {
            [key: string]: unknown;
        };
        
        ResponseFormatText: {
            
            type: "text";
        };
        ServiceTier: ("auto" | "default" | "flex" | "scale" | "priority" | "fast") | null;
        StopConfiguration: ((string | null) | string[]) | null;
        Verbosity: ("low" | "medium" | "high") | null;
        
        WebSearchContextSize: "low" | "medium" | "high";
        
        WebSearchLocation: {
            city?: string;
            country?: string;
            region?: string;
            timezone?: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;

}
declare module "@lovable.dev/ai-gateway" {
  interface GeneratedModelsBySurface {
    "chat-completions": "google/gemini-2.5-flash" | "google/gemini-2.5-flash-image" | "google/gemini-2.5-flash-lite" | "google/gemini-2.5-pro" | "google/gemini-3-flash-preview" | "google/gemini-3-pro-image" | "google/gemini-3.1-flash-image" | "google/gemini-3.1-flash-lite" | "google/gemini-3.1-pro-preview" | "google/gemini-3.5-flash" | "google/gemini-3.6-flash" | "google/gemini-3.7-flash" | "google/gemini-3.8-flash" | "google/gemini-4-argon" | "openai/chat-latest" | "openai/gpt-5" | "openai/gpt-5-mini" | "openai/gpt-5-nano" | "openai/gpt-5.2" | "openai/gpt-5.4" | "openai/gpt-5.4-mini" | "openai/gpt-5.4-nano" | "openai/gpt-5.5" | "openai/gpt-5.6-luna" | "openai/gpt-5.6-sol" | "openai/gpt-5.6-terra" | "openai/gpt-6-astra";
    "responses": "openai/chat-latest" | "openai/gpt-5" | "openai/gpt-5-mini" | "openai/gpt-5-nano" | "openai/gpt-5.2" | "openai/gpt-5.4" | "openai/gpt-5.4-mini" | "openai/gpt-5.4-nano" | "openai/gpt-5.4-pro" | "openai/gpt-5.5" | "openai/gpt-5.5-pro" | "openai/gpt-5.6-luna" | "openai/gpt-5.6-sol" | "openai/gpt-5.6-terra" | "openai/gpt-6-astra";
    "messages": "anthropic/claude-opus-5-5";
    "interactions": never;
    "image-generation": "google/gemini-2.5-flash-image" | "google/gemini-3-pro-image" | "google/gemini-3.1-flash-image" | "google/gemini-3.1-flash-lite-image" | "openai/gpt-image-1-mini" | "openai/gpt-image-2";
    "image-edit": "openai/gpt-image-1-mini" | "openai/gpt-image-2";
    "embeddings": "google/gemini-embedding-001" | "google/gemini-embedding-2" | "openai/text-embedding-3-large" | "openai/text-embedding-3-small";
    "speech": "google/gemini-2.5-flash-lite-preview-tts" | "google/gemini-2.5-flash-tts" | "google/gemini-2.5-pro-tts" | "google/gemini-3.1-flash-tts-preview" | "openai/gpt-4o-mini-tts";
    "transcription": "google/gemini-3.5-transcribe" | "openai/gpt-4o-mini-transcribe" | "openai/gpt-4o-transcribe";
    "music": never;
    "videos": "google/gemini-omni-1.1-flash" | "google/veo-3.1" | "google/veo-3.1-fast" | "google/veo-3.1-lite";
    "systemone": never;
    "live": never;
  }
  interface MessagesFieldsByModel {
    "anthropic/claude-opus-5-5": ModelContract_cfe0652e9d685783.components["schemas"]["MessagesRequest"];
  }
  interface MessagesResponseByModel {
    "anthropic/claude-opus-5-5": ModelContract_cfe0652e9d685783.components["schemas"]["MessagesResponse"];
  }
  interface MessagesEventByModel {
    "anthropic/claude-opus-5-5": ModelContract_cfe0652e9d685783.components["schemas"]["MessagesEvent"];
  }
  interface ChatFieldsByModel {
    "google/gemini-4-argon": ModelContract_7ff6a9f995dcaa1c.components["schemas"]["ChatRequest"];
  }
  interface ChatResponseByModel {
    "google/gemini-4-argon": ModelContract_7ff6a9f995dcaa1c.components["schemas"]["ChatResponse"];
  }
  interface ChatEventByModel {
    "google/gemini-4-argon": ModelContract_7ff6a9f995dcaa1c.components["schemas"]["ChatEvent"];
  }
}
