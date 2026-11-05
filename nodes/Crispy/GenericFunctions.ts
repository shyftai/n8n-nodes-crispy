import type {
	IDataObject,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeListSearchResult,
} from 'n8n-workflow';

/**
 * Candidate keys that commonly wrap a list of items in Crispy API responses.
 * The first array-valued key found is used as the set of output items; if
 * none match, the whole response body is returned as a single item.
 */
const LIST_WRAPPER_KEYS = [
	'data',
	'items',
	'results',
	'accounts',
	'people',
	'profiles',
	'contacts',
	'lists',
	'campaigns',
	'conversations',
	'messages',
	'webhooks',
];

function extractItems(body: unknown): IDataObject[] {
	if (Array.isArray(body)) {
		return body as IDataObject[];
	}
	if (body && typeof body === 'object') {
		const obj = body as IDataObject;
		for (const key of LIST_WRAPPER_KEYS) {
			const value = obj[key];
			if (Array.isArray(value)) {
				return value as IDataObject[];
			}
		}
		return [obj];
	}
	return [{ data: body } as IDataObject];
}

function trimToTopFields(item: IDataObject, maxFields: number): IDataObject {
	const keys = Object.keys(item).slice(0, maxFields);
	const trimmed: IDataObject = {};
	for (const key of keys) {
		trimmed[key] = item[key];
	}
	return trimmed;
}

/**
 * Builds a `routing.output.postReceive` function that:
 * - Splits the response body into one n8n item per entry of the first
 *   list-shaped field it finds (falling back to the whole body as one item).
 * - When the "Simplify" parameter is `true` (the default), trims every
 *   output item down to its first `maxFields` top-level keys so large,
 *   deeply-nested Crispy payloads stay readable in the n8n UI.
 * - When "Simplify" is `false`, returns the untouched response.
 */
export function simplifyPostReceive(maxFields = 10) {
	return async function (
		this: IExecuteSingleFunctions,
		items: INodeExecutionData[],
		response: IN8nHttpFullResponse,
	): Promise<INodeExecutionData[]> {
		let simplify = true;
		try {
			simplify = this.getNodeParameter('simplify') as boolean;
		} catch {
			// "simplify" is not defined for every operation; default to true.
		}

		const body = response.body ?? items[0]?.json;
		const extracted = extractItems(body);

		if (!simplify) {
			return extracted.map((entry) => ({ json: entry }));
		}

		return extracted.map((entry) => ({ json: trimToTopFields(entry, maxFields) }));
	};
}

/**
 * Builds a `routing.output.postReceive` function for operations that do NOT
 * expose a "Simplify" toggle (their raw response is small/flat enough that
 * trimming isn't needed). Still splits list-shaped bodies into one n8n item
 * per entry, but never drops fields.
 */
export function rawListPostReceive() {
	return async function (
		this: IExecuteSingleFunctions,
		items: INodeExecutionData[],
		response: IN8nHttpFullResponse,
	): Promise<INodeExecutionData[]> {
		const body = response.body ?? items[0]?.json;
		return extractItems(body).map((entry) => ({ json: entry }));
	};
}

/**
 * Returns the raw response body as a single n8n item, with no JSON
 * assumptions. Used for routes (like Contact → Get Many) whose success
 * response can be a non-JSON body such as CSV text.
 */
export async function rawBodyPostReceive(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const body = response.body;
	if (typeof body === 'string') {
		return [{ json: { data: body } }];
	}
	return items.length > 0 ? items : [{ json: (body as IDataObject) ?? {} }];
}

async function searchFromList(
	this: ILoadOptionsFunctions,
	path: string,
	listKey: string,
	idField: string,
	nameFields: string[],
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = await this.helpers.httpRequestWithAuthentication.call(this, 'crispyApi', {
		method: 'GET',
		url: `https://crispy.sh${path}`,
		json: true,
	});

	const body = (response as IDataObject) ?? {};
	let entries: IDataObject[] = [];
	if (Array.isArray(body)) {
		entries = body as IDataObject[];
	} else if (Array.isArray(body[listKey])) {
		entries = body[listKey] as IDataObject[];
	} else if (Array.isArray(body.data)) {
		entries = body.data as IDataObject[];
	}

	const results = entries
		.map((entry) => {
			const id = String(entry[idField] ?? '');
			let name = '';
			for (const field of nameFields) {
				if (entry[field]) {
					name = String(entry[field]);
					break;
				}
			}
			return { name: name || id, value: id };
		})
		.filter((entry) => entry.value)
		.filter((entry) =>
			filter ? entry.name.toLowerCase().includes(filter.toLowerCase()) : true,
		);

	return { results };
}

export async function searchLists(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return searchFromList.call(this, '/api/v1/lists', 'lists', 'id', ['name', 'title'], filter);
}

export async function searchCampaigns(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return searchFromList.call(
		this,
		'/api/v1/campaigns',
		'campaigns',
		'campaign_id',
		['name', 'title'],
		filter,
	);
}

export async function searchConversations(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return searchFromList.call(
		this,
		'/api/v1/inbox/conversations',
		'conversations',
		'chat_id',
		['subject', 'participant_name', 'name'],
		filter,
	);
}
